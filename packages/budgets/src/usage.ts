import {
  selectCategoryExpenses,
  selectPeriodTotals,
} from '@money-level/analytics';
import type { DatePeriod } from '@money-level/analytics';
import { subtractMinorUnits } from '@money-level/finance-core';
import type { Transaction } from '@money-level/finance-core';
import type { Budget } from './index.js';

export const budgetThresholds = ['80', '100', 'over'] as const;
export type BudgetThreshold = (typeof budgetThresholds)[number];

export function selectBudgetUsage(
  budget: Budget,
  transactions: readonly Transaction[],
  period: DatePeriod,
  notified: readonly BudgetThreshold[] = [],
) {
  const spentMinor = budget.categoryId
    ? (selectCategoryExpenses(transactions, period).find(
        (category) => category.categoryId === budget.categoryId,
      )?.amountMinor ?? '0')
    : selectPeriodTotals(transactions, period).expenseMinor;
  const spent = BigInt(spentMinor);
  const limit = BigInt(budget.limitMinor);
  const reached: BudgetThreshold[] = [];
  if (spent * 100n >= limit * 80n) reached.push('80');
  if (spent >= limit) reached.push('100');
  if (spent > limit) reached.push('over');
  return {
    spentMinor,
    remainingMinor: subtractMinorUnits(budget.limitMinor, spentMinor),
    reached,
    newThresholds: budget.active
      ? reached.filter((threshold) => !notified.includes(threshold))
      : [],
  };
}
