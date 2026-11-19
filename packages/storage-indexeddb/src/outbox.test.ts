import { recordTransactionChange } from '@money-level/application';
import { expect, test } from 'vitest';
import { exampleId, expense, instant, journalFixture } from './fixtures.js';

const event = {
  eventId: exampleId(4),
  type: 'transaction.expense.created',
  sourceEntityId: expense.id,
  version: 1,
  occurredAt: instant,
  payload: {},
};

test('commits an operation and a minimal outbox event together', async () => {
  const storage = journalFixture().open();
  try {
    await storage.write((journal) =>
      recordTransactionChange(
        journal,
        { ...expense, note: 'Dummy note' },
        event,
      ),
    );
    await storage.read(async (journal) => {
      expect(await journal.transactions.get(expense.id)).toMatchObject({
        note: 'Dummy note',
      });
      expect(await journal.outbox.list()).toEqual([event]);
    });
  } finally {
    storage.close();
  }
});

test('a duplicate event rejects the entire write and leaves prior data intact', async () => {
  const storage = journalFixture().open();
  try {
    await storage.write((journal) =>
      recordTransactionChange(journal, expense, event),
    );
    const anotherExpense = { ...expense, id: exampleId(5) };
    await expect(
      storage.write((journal) =>
        recordTransactionChange(journal, anotherExpense, {
          ...event,
          sourceEntityId: anotherExpense.id,
        }),
      ),
    ).rejects.toMatchObject({ name: 'ConstraintError' });
    await storage.read(async (journal) => {
      expect(await journal.transactions.list()).toEqual([expense]);
      expect(await journal.outbox.list()).toEqual([event]);
    });
  } finally {
    storage.close();
  }
});
