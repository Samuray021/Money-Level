import type { Transaction } from '@money-level/finance-core';
import { expect, test } from 'vitest';
import { compareHistoryEntries, filterHistoryEntries } from './history.js';

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

test('history applies type, either transfer account, category, calendar range and note together', () => {
  const expense: Transaction = {
    ...common,
    kind: 'expense',
    id: 'e1',
    categoryId: 'food',
    note: 'Вечером КОФЕ',
  };
  const entries: Transaction[] = [
    commonWithId('opening'),
    expense,
    { ...expense, id: 'e2', note: 'еда' },
    { ...expense, id: 'e3', categoryId: 'shopping' },
    { ...expense, id: 'e4', transactionDate: '2026-11-18' },
    { ...common, id: 't', kind: 'transfer', toAccountId: 'cash' },
    { ...expense, id: 'e5', deletedAt: common.updatedAt },
  ];
  expect(
    filterHistoryEntries(entries, {
      kind: 'expense',
      accountId: 'account',
      categoryId: 'food',
      from: '2026-11-19',
      to: '2026-11-19',
      note: 'кофе',
    }),
  ).toEqual([expense]);
  expect(
    filterHistoryEntries(entries, { accountId: 'cash' }).map(({ id }) => id),
  ).toEqual(['t']);
  expect(
    filterHistoryEntries(entries, { kind: 'opening' }).map(({ id }) => id),
  ).toEqual(['opening']);
  expect(
    filterHistoryEntries(entries, { from: '2026-11-20', to: '2026-11-19' }),
  ).toEqual([]);
});

function commonWithId(id: string): Transaction {
  return { ...common, id };
}
