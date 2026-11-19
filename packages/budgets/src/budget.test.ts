import { expect, test } from 'vitest';
import { budgetSchema } from './index.js';

export const budget = {
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
