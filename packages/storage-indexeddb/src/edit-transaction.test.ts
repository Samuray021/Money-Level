import {
  addExpense,
  deleteTransaction,
  updateTransaction,
} from '@money-level/application';
import { selectAccountBalance } from '@money-level/finance-core';
import { expect, test } from 'vitest';
import { account, category, commandFixture, day } from './fixtures.js';

const input = {
  idempotencyKey: 'old-expense',
  accountId: account.id,
  categoryId: category.id,
  transactionDate: day,
  amountMinor: '100000',
  note: 'Test',
};

test('updates an existing entry and recalculates the balance, preserving historical archived references', async () => {
  const { context, storage } = await commandFixture();
  try {
    const original = await addExpense(context, input);
    await storage.write((journal) =>
      journal.categories.put({ ...category, archived: true }),
    );
    const changed = await updateTransaction(context, original.id, {
      note: null,
      amountMinor: '30000',
      transactionDate: '2026-10-31',
    });

    expect(changed).toMatchObject({
      id: original.id,
      kind: 'expense',
      transactionDate: '2026-10-31',
    });
    expect(changed).not.toHaveProperty('note');
    await expect(
      updateTransaction(context, original.id, { amountMinor: '-1' }),
    ).rejects.toThrow();
    await expect(
      updateTransaction(context, original.id, {
        amountMinor: '1',
        ...{ kind: 'income' },
      }),
    ).rejects.toThrow();
    const transactions = await storage.read((journal) =>
      journal.transactions.list(),
    );
    expect(transactions).toEqual([changed]);
    expect(selectAccountBalance(transactions, account.id)).toBe('-30000');
  } finally {
    storage.close();
  }
});

test('soft-deletes idempotently, preserving history and recalculating the balance', async () => {
  const { context, storage } = await commandFixture();
  try {
    const original = await addExpense(context, input);
    await deleteTransaction(context, original.id);
    await deleteTransaction(context, original.id);
    await expect(
      updateTransaction(context, original.id, { amountMinor: '10' }),
    ).rejects.toThrow(RangeError);

    await storage.read(async (journal) => {
      const [retained] = await journal.transactions.list();
      expect(retained).toMatchObject({
        ...original,
        deletedAt: expect.any(String),
        updatedAt: expect.any(String),
      });
      expect(
        selectAccountBalance(await journal.transactions.list(), account.id),
      ).toBe('0');
      expect(
        (await journal.outbox.list()).filter(
          ({ type }) => type === 'transaction.deleted',
        ),
      ).toHaveLength(1);
    });
  } finally {
    storage.close();
  }
});
