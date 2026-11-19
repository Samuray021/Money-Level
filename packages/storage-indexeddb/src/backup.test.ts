import {
  addExpense,
  backupFileSchema,
  exportBackup,
  exportTransactionsCsv,
  finishOnboarding,
  initializeProfile,
  validateBackupJson,
} from '@money-level/application';
import { selectTotalBalance } from '@money-level/finance-core';
import { expect, test } from 'vitest';
import { sha256Checksum } from './index.js';
import { day, exampleId, instant, journalFixture } from './fixtures.js';

async function backupFixture() {
  const { open } = journalFixture();
  const storage = open();
  let sequence = 100;
  const context = {
    storage,
    createId: () => exampleId(sequence++),
    clock: { now: () => new Date(instant) },
    baseCurrency: 'RUB',
  };
  const profile = await initializeProfile(context, {
    currency: 'RUB',
    name: 'Карта',
    kind: 'card',
    timeZone: 'Europe/Moscow',
  });
  await finishOnboarding(context, {
    openingAmount: '500',
    humorFrequency: 'off',
    profanityEnabled: false,
  });
  const food = await storage.read(async ({ categories }) =>
    (await categories.list()).find(
      (entry) => entry.type === 'expense' && entry.name === 'Еда',
    ),
  );
  if (!food) throw new Error('Expected starter category.');
  await addExpense(context, {
    accountId: profile.firstAccountId,
    categoryId: food.id,
    amountMinor: '8000',
    transactionDate: day,
    idempotencyKey: 'expense',
    note: '=Тест',
  });
  return { open, storage, context };
}

test('JSON serialization preserves balances, command receipts and committed events', async () => {
  const { storage, context } = await backupFixture();
  try {
    const file = await exportBackup(storage, sha256Checksum, context.clock);
    const copy = backupFileSchema.parse(JSON.parse(JSON.stringify(file)));
    expect(copy).toEqual(file);
    expect(copy.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(selectTotalBalance(copy.data.accounts, copy.data.transactions)).toBe(
      '42000',
    );
    expect(copy.data.commandReceipts).toHaveLength(1);
    expect(copy.data.outbox).toHaveLength(1);
    expect(copy.data.settings).toMatchObject({
      baseCurrency: 'RUB',
      onboardingCompleted: true,
    });
    expect(await sha256Checksum('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  } finally {
    storage.close();
  }
});

test('CSV has a stable UTF-8 header and exact amounts and prevents formula execution in a note', async () => {
  const { storage } = await backupFixture();
  try {
    const csv = await exportTransactionsCsv(storage);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toMatch(
      /^\ufeffid,transaction_date,kind,amount,currency,account_id,to_account_id,category_id,note\r\n/,
    );
    expect(csv).toContain('"2026-11-19","expense","80.00","RUB"');
    expect(csv).toContain('"\'=Тест"');
    expect(csv).toContain('"opening","500.00","RUB"');
  } finally {
    storage.close();
  }
});

test('backup validation rejects altered contents and dangling references without touching storage', async () => {
  const { storage, context } = await backupFixture();
  try {
    const original = await exportBackup(storage, sha256Checksum, context.clock);
    await expect(
      validateBackupJson(JSON.stringify(original), sha256Checksum),
    ).resolves.toEqual(original);
    await expect(
      validateBackupJson('{"broken":', sha256Checksum),
    ).rejects.toThrow(SyntaxError);

    const { schemaVersion, createdAt } = original;
    const duplicate = {
      ...original.data,
      transactions: [
        ...original.data.transactions,
        ...original.data.transactions,
      ],
    };
    await expect(
      validateBackupJson(
        JSON.stringify({ ...original, data: duplicate }),
        sha256Checksum,
      ),
    ).rejects.toThrow(/checksum/);
    const digest = await sha256Checksum(
      JSON.stringify({ schemaVersion, createdAt, data: duplicate }),
    );
    await expect(
      validateBackupJson(
        JSON.stringify({ ...original, data: duplicate, checksum: digest }),
        sha256Checksum,
      ),
    ).rejects.toThrow(/Duplicate/);

    const dangling = { ...original.data, categories: [] };
    const checksum = await sha256Checksum(
      JSON.stringify({ schemaVersion, createdAt, data: dangling }),
    );
    await expect(
      validateBackupJson(
        JSON.stringify({ ...original, data: dangling, checksum }),
        sha256Checksum,
      ),
    ).rejects.toThrow(/category/);
    expect(await exportBackup(storage, sha256Checksum, context.clock)).toEqual(
      original,
    );
  } finally {
    storage.close();
  }
});
