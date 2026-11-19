import { expect, test } from 'vitest';
import { backupFileSchema } from './backup-format.js';

const empty = {
  schemaVersion: 1,
  createdAt: '2026-11-19T12:00:00.000Z',
  checksum: 'f'.repeat(64),
  data: {
    settings: null,
    accounts: [],
    categories: [],
    transactions: [],
    budgets: [],
    budgetNotices: [],
    goals: [],
    goalAllocations: [],
    outbox: [],
    eventReceipts: [],
    memeShown: [],
    achievements: [],
    commandReceipts: [],
  },
};

test('backup envelope checks the schema version, timestamp and SHA-256 format', () => {
  expect(backupFileSchema.parse(empty)).toEqual(empty);
  expect(
    backupFileSchema.safeParse({ ...empty, schemaVersion: 2 }).success,
  ).toBe(false);
  expect(
    backupFileSchema.safeParse({ ...empty, checksum: 'wrong' }).success,
  ).toBe(false);
  expect(
    backupFileSchema.safeParse({ ...empty, createdAt: '2026-02-31' }).success,
  ).toBe(false);
});
