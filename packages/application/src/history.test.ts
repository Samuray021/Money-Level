import type { Transaction } from '@money-level/finance-core';
import { expect, test } from 'vitest';
import { compareHistoryEntries } from './history.js';

const common = {
  kind: 'opening',
  currencyCode: 'RUB',
  amountMinor: '1',
  accountId: 'account',
  transactionDate: '2026-11-19',
  createdAt: '2026-11-19T12:00:00Z',
  updatedAt: '2026-11-19T12:00:00Z',
} as const;

test('history entries break date ties by creation instant and then UUID', () => {
  const entries: Transaction[] = [
    { ...common, id: 'b' },
    { ...common, id: 'd', transactionDate: '2026-11-20' },
    { ...common, id: 'a' },
    { ...common, id: 'c', createdAt: '2026-11-19T12:00:00.010Z' },
    { ...common, id: 'e', transactionDate: '2026-11-18' },
  ];
  expect(entries.sort(compareHistoryEntries).map((entry) => entry.id)).toEqual([
    'd',
    'c',
    'a',
    'b',
    'e',
  ]);
});
