import { isoDateSchema } from '@money-level/contracts';
import type { ISODate, MinorUnits } from '@money-level/contracts';
import {
  addMinorUnits,
  compareMinorUnits,
  subtractMinorUnits,
} from '@money-level/finance-core';
import type { Transaction } from '@money-level/finance-core';

export interface DatePeriod {
  from: ISODate;
  until: ISODate;
}

export interface PeriodTotals {
  incomeMinor: MinorUnits;
  expenseMinor: MinorUnits;
  netMinor: MinorUnits;
}

function validatedPeriod(period: DatePeriod): DatePeriod {
  const from = isoDateSchema.parse(period.from);
  const until = isoDateSchema.parse(period.until);
  if (from >= until)
    throw new RangeError('A report period must have a positive duration.');

  return { from, until };
}

export function selectPeriodTotals(
  transactions: readonly Transaction[],
  period: DatePeriod,
): PeriodTotals {
  const { from, until } = validatedPeriod(period);
  return summarizeCashFlow(
    transactions.filter(
      (entry) => entry.transactionDate >= from && entry.transactionDate < until,
    ),
  );
}

export function summarizeCashFlow(
  transactions: readonly Transaction[],
): PeriodTotals {
  let incomeMinor: MinorUnits = '0';
  let expenseMinor: MinorUnits = '0';
  for (const entry of transactions) {
    if (entry.deletedAt) continue;
    if (entry.kind === 'income')
      incomeMinor = addMinorUnits(incomeMinor, entry.amountMinor);
    if (entry.kind === 'expense')
      expenseMinor = addMinorUnits(expenseMinor, entry.amountMinor);
  }
  return {
    incomeMinor,
    expenseMinor,
    netMinor: subtractMinorUnits(incomeMinor, expenseMinor),
  };
}

export function calendarMonthPeriod(localDate: ISODate): DatePeriod {
  const from = isoDateSchema.parse(localDate).slice(0, 7) + '-01';
  const nextMonth = new Date(from + 'T00:00:00.000Z');
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  return { from, until: nextMonth.toISOString().slice(0, 10) };
}

type Expense = Extract<Transaction, { kind: 'expense' }>;

function expensesWithin(
  transactions: readonly Transaction[],
  from: ISODate,
  until: ISODate,
): Expense[] {
  return transactions.filter(
    (entry): entry is Expense =>
      entry.kind === 'expense' &&
      !entry.deletedAt &&
      entry.transactionDate >= from &&
      entry.transactionDate < until,
  );
}

export interface CategoryExpense {
  categoryId: string;
  amountMinor: MinorUnits;
}

export function selectCategoryExpenses(
  transactions: readonly Transaction[],
  period: DatePeriod,
): CategoryExpense[] {
  const { from, until } = validatedPeriod(period);
  const totals = new Map<string, MinorUnits>();
  for (const entry of expensesWithin(transactions, from, until)) {
    totals.set(
      entry.categoryId,
      addMinorUnits(totals.get(entry.categoryId) ?? '0', entry.amountMinor),
    );
  }
  return [...totals]
    .map(([categoryId, amountMinor]) => ({ categoryId, amountMinor }))
    .sort(
      (left, right) =>
        compareMinorUnits(right.amountMinor, left.amountMinor) ||
        left.categoryId.localeCompare(right.categoryId),
    );
}

export interface ExpenseSeriesPoint {
  date: ISODate;
  amountMinor: MinorUnits;
}

export function selectExpenseSeries(
  transactions: readonly Transaction[],
  period: DatePeriod,
  grain: 'day' | 'month',
): ExpenseSeriesPoint[] {
  const { from, until } = validatedPeriod(period);
  const monthly = grain === 'month';
  const totals = new Map<ISODate, MinorUnits>();
  for (const entry of expensesWithin(transactions, from, until)) {
    const date = monthly
      ? entry.transactionDate.slice(0, 7) + '-01'
      : entry.transactionDate;
    totals.set(date, addMinorUnits(totals.get(date) ?? '0', entry.amountMinor));
  }

  const cursor = new Date(from + 'T00:00:00.000Z');
  const end = Date.parse(until + 'T00:00:00.000Z');
  if (monthly) cursor.setUTCDate(1);
  const points: ExpenseSeriesPoint[] = [];
  while (cursor.getTime() < end) {
    const date = cursor.toISOString().slice(0, 10);
    points.push({ date, amountMinor: totals.get(date) ?? '0' });
    if (monthly) cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    else cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return points;
}

export function selectExpenseCount(
  transactions: readonly Transaction[],
  period: DatePeriod,
): number {
  const { from, until } = validatedPeriod(period);
  return expensesWithin(transactions, from, until).length;
}

export function selectMostFrequentExpenseCategory(
  transactions: readonly Transaction[],
  period: DatePeriod,
): { categoryId: string; count: number } | undefined {
  const { from, until } = validatedPeriod(period);
  const counts = new Map<string, number>();
  for (const { categoryId } of expensesWithin(transactions, from, until))
    counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1);
  const [first] = [...counts].sort(
    ([leftId, leftCount], [rightId, rightCount]) =>
      rightCount - leftCount || leftId.localeCompare(rightId),
  );
  return first ? { categoryId: first[0], count: first[1] } : undefined;
}

export function shiftCalendarDate(date: ISODate, days: number): ISODate {
  const instant = new Date(isoDateSchema.parse(date) + 'T00:00:00.000Z');
  instant.setUTCDate(instant.getUTCDate() + days);
  return instant.toISOString().slice(0, 10);
}

export function calendarWeekPeriod(date: ISODate): DatePeriod {
  const weekday = new Date(
    isoDateSchema.parse(date) + 'T00:00:00.000Z',
  ).getUTCDay();
  const from = shiftCalendarDate(date, -((weekday + 6) % 7));
  return { from, until: shiftCalendarDate(from, 7) };
}
