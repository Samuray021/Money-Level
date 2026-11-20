import { expect, test } from 'vitest';
import { account, category, expense, journalFixture } from './fixtures.js';

test('persists the journal, accounts and categories across database connections', async () => {
  const { open } = journalFixture();
  const before = open();

  try {
    await before.write(async (journal) => {
      await journal.accounts.put(account);
      await journal.categories.put(category);
      await journal.transactions.put(expense);
    });
  } finally {
    before.close();
  }

  const after = open();
  try {
    await after.read(async (journal) => {
      expect(await journal.accounts.get(account.id)).toEqual(account);
      expect(await journal.categories.list()).toEqual([category]);
      expect(await journal.transactions.list()).toEqual([expense]);
      expect(await journal.transactions.get('missing')).toBeUndefined();
    });
  } finally {
    after.close();
  }
});

test('rolls the storage transaction back if a record is invalid', async () => {
  const storage = journalFixture().open();
  try {
    await expect(
      storage.write(async (journal) => {
        await journal.accounts.put(account);
        await journal.transactions.put({ ...expense, amountMinor: '15.50' });
      }),
    ).rejects.toThrow();
    expect(await storage.read((journal) => journal.accounts.list())).toEqual(
      [],
    );
  } finally {
    storage.close();
  }
});
