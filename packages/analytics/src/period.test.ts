import type { Transaction } from '@money-level/finance-core';
import { expect, test } from 'vitest';
import { selectPeriodTotals } from './index.js';

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
