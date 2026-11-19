import { Dexie } from 'dexie';
import { expect, test } from 'vitest';
import { account, category, expense, journalFixture } from './fixtures.js';
import { currentJournalSchemaVersion } from './index.js';

function versionOne(
  dependencies: ReturnType<typeof journalFixture>['dependencies'],
) {
  const database = new Dexie('money-level-test', dependencies);
  database.version(1).stores({
    accounts: 'id',
    categories: 'id, type',
    transactions: 'id, transactionDate, accountId, toAccountId, categoryId',
  });
  return database;
}

test('upgrades a version-one database and preserves all journal entries on repeated opens', async () => {
  const { dependencies, open } = journalFixture();
  const legacy = versionOne(dependencies);
  try {
    await legacy.table('accounts').add(account);
    await legacy.table('categories').add(category);
    await legacy.table('transactions').add(expense);
  } finally {
    legacy.close();
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const journal = open();
    try {
      expect(await journal.schemaVersion()).toBe(currentJournalSchemaVersion);
      await journal.read(async (store) => {
        expect(await store.accounts.list()).toEqual([account]);
        expect(await store.categories.list()).toEqual([category]);
        expect(await store.transactions.list()).toEqual([expense]);
        expect(await store.outbox.list()).toEqual([]);
      });
    } finally {
      journal.close();
    }
  }
});

test('a migration failure leaves the original database recoverable', async () => {
  const { dependencies, open } = journalFixture();
  const corrupted = { ...expense, amountMinor: 'NaN' };
  const legacy = versionOne(dependencies);
  try {
    await legacy.table('transactions').add(corrupted);
  } finally {
    legacy.close();
  }

  const upgraded = open();
  try {
    await expect(upgraded.schemaVersion()).rejects.toThrow();
  } finally {
    upgraded.close();
  }

  const recovered = versionOne(dependencies);
  try {
    await recovered.open();
    expect(recovered.verno).toBe(1);
    expect(await recovered.table('transactions').get(expense.id)).toEqual(
      corrupted,
    );
    expect(recovered.tables.map((table) => table.name)).not.toContain(
      'appMigrations',
    );
  } finally {
    recovered.close();
  }
});
