import { addMinorUnits } from '@money-level/finance-core';
import type { Transaction } from '@money-level/finance-core';
import { expect, test } from 'vitest';
import {
  selectCategoryExpenses,
  selectExpenseSeries,
  selectPeriodTotals,
} from './index.js';

const record = {
  id: 'd0000000-0000-4000-8000-000000000001',
  accountId: 'd0000000-0000-4000-8000-000000000002',
  amountMinor: '30000',
  currencyCode: 'RUB',
  transactionDate: '2026-11-01',
  createdAt: '2026-12-01T00:00:00.000Z',
  updatedAt: '2026-12-02T00:00:00.000Z',
} as const;
const categorized = {
  ...record,
  categoryId: 'd0000000-0000-4000-8000-000000000004',
};
const period = { from: '2026-11-01', until: '2026-12-01' };

test('TC-FIN-006: groups transactions by their local calendar dates', () => {
  const entries: Transaction[] = [
    { ...categorized, kind: 'expense', transactionDate: '2026-10-31' },
    { ...categorized, kind: 'expense' },
    {
      ...categorized,
      kind: 'income',
      amountMinor: '5000000',
      transactionDate: '2026-11-30',
    },
    { ...categorized, kind: 'income', transactionDate: '2026-12-01' },
  ];
  expect(selectPeriodTotals(entries, period)).toEqual({
    incomeMinor: '5000000',
    expenseMinor: '30000',
    netMinor: '4970000',
  });
});

test('period totals exclude opening amounts, transfers, corrections and deleted entries', () => {
  const entries: Transaction[] = [
    { ...record, kind: 'opening' },
    { ...record, kind: 'adjustment', amountMinor: '-500' },
    {
      ...record,
      kind: 'transfer',
      toAccountId: 'd0000000-0000-4000-8000-000000000003',
    },
    { ...categorized, kind: 'expense', deletedAt: record.updatedAt },
  ];
  expect(selectPeriodTotals(entries, period)).toEqual({
    incomeMinor: '0',
    expenseMinor: '0',
    netMinor: '0',
  });
  expect(() =>
    selectPeriodTotals(entries, { ...period, from: period.until }),
  ).toThrow(RangeError);
});

test('category totals reconcile exactly with the period expense total', () => {
  const entries: Transaction[] = [
    { ...categorized, kind: 'expense', amountMinor: '9007199254740993' },
    { ...categorized, kind: 'expense', amountMinor: '7' },
    {
      ...categorized,
      kind: 'expense',
      amountMinor: '3',
      categoryId: record.accountId,
    },
    { ...categorized, kind: 'income', amountMinor: '25' },
    { ...categorized, kind: 'expense', transactionDate: '2026-10-31' },
    { ...categorized, kind: 'expense', deletedAt: record.createdAt },
  ];
  const categories = selectCategoryExpenses(entries, period);
  expect(categories).toEqual([
    { categoryId: categorized.categoryId, amountMinor: '9007199254741000' },
    { categoryId: record.accountId, amountMinor: '3' },
  ]);
  expect(
    categories.reduce((sum, item) => addMinorUnits(sum, item.amountMinor), '0'),
  ).toBe(selectPeriodTotals(entries, period).expenseMinor);
});

test('builds complete daily and monthly expense series across leap days and month boundaries', () => {
  const entries: Transaction[] = [
    { ...categorized, kind: 'expense', transactionDate: '2024-02-29' },
    {
      ...categorized,
      kind: 'expense',
      transactionDate: '2024-03-01',
      amountMinor: '20',
    },
    {
      ...categorized,
      kind: 'expense',
      transactionDate: '2024-03-03',
      amountMinor: '100',
    },
    { ...categorized, kind: 'income', transactionDate: '2024-03-02' },
  ];
  const window = { from: '2024-02-28', until: '2024-03-03' };
  expect(selectExpenseSeries(entries, window, 'day')).toEqual([
    { date: '2024-02-28', amountMinor: '0' },
    { date: '2024-02-29', amountMinor: '30000' },
    { date: '2024-03-01', amountMinor: '20' },
    { date: '2024-03-02', amountMinor: '0' },
  ]);
  expect(selectExpenseSeries(entries, window, 'month')).toEqual([
    { date: '2024-02-01', amountMinor: '30000' },
    { date: '2024-03-01', amountMinor: '20' },
  ]);
});

test('fills the month series across a year boundary', () => {
  expect(
    selectExpenseSeries(
      [],
      { from: '2025-12-15', until: '2026-02-01' },
      'month',
    ),
  ).toEqual([
    { date: '2025-12-01', amountMinor: '0' },
    { date: '2026-01-01', amountMinor: '0' },
  ]);
});
