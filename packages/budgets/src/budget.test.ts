import { expect, test } from 'vitest';
import { budgetSchema, selectBudgetUsage } from './index.js';
import type { BudgetThreshold } from './index.js';

const budget = {
  id: 'd0000000-0000-4000-8000-000000000055',
  periodType: 'month',
  limitMinor: '10000',
  active: true,
  createdAt: '2026-11-19T12:00:00.000Z',
  updatedAt: '2026-11-19T12:00:00.000Z',
} as const;

test('a positive monthly limit applies either to all expenses or to one category', () => {
  const perCategory = {
    ...budget,
    categoryId: 'd0000000-0000-4000-8000-000000000011',
  };
  expect(budgetSchema.parse(budget)).toEqual(budget);
  expect(budgetSchema.parse(perCategory)).toEqual(perCategory);
  expect(
    budgetSchema.safeParse({ ...perCategory, periodType: 'week' }).success,
  ).toBe(false);
  expect(
    budgetSchema.safeParse({ ...perCategory, limitMinor: '-10' }).success,
  ).toBe(false);
  expect(
    budgetSchema.safeParse({ ...perCategory, limitMinor: '0' }).success,
  ).toBe(false);
  expect(
    budgetSchema.safeParse({ ...perCategory, kind: 'expense' }).success,
  ).toBe(false);
});

const entry = {
  id: budget.id,
  accountId: 'd0000000-0000-4000-8000-000000000012',
  categoryId: 'd0000000-0000-4000-8000-000000000011',
  kind: 'expense',
  currencyCode: 'RUB',
  transactionDate: '2026-11-10',
  createdAt: budget.createdAt,
  updatedAt: budget.updatedAt,
} as const;
const november = { from: '2026-11-01', until: '2026-12-01' };

test('a threshold is due only on its first crossing in the period', () => {
  const usage = (amountMinor: string, notified: BudgetThreshold[] = []) =>
    selectBudgetUsage(budget, [{ ...entry, amountMinor }], november, notified);
  expect(usage('7999').newThresholds).toEqual([]);
  expect(usage('8000').newThresholds).toEqual(['80']);
  expect(usage('10000', ['80']).newThresholds).toEqual(['100']);
  expect(usage('10001', ['80', '100'])).toMatchObject({
    remainingMinor: '-1',
    newThresholds: ['over'],
  });
  expect(usage('20000', ['80', '100', 'over']).newThresholds).toEqual([]);
});

test('category and month changes recompute usage without creating a transaction', () => {
  const transactions = [{ ...entry, amountMinor: '8000' }];
  expect(
    selectBudgetUsage(
      { ...budget, categoryId: entry.accountId },
      transactions,
      november,
    ).spentMinor,
  ).toBe('0');
  expect(
    selectBudgetUsage(
      { ...budget, categoryId: entry.categoryId },
      transactions,
      november,
    ).spentMinor,
  ).toBe('8000');
  expect(
    selectBudgetUsage(budget, transactions, {
      from: '2026-12-01',
      until: '2027-01-01',
    }).newThresholds,
  ).toEqual([]);
  expect(
    selectBudgetUsage({ ...budget, active: false }, transactions, november)
      .newThresholds,
  ).toEqual([]);
  expect(transactions).toEqual([{ ...entry, amountMinor: '8000' }]);
});
