import { isoDateSchema } from '@money-level/contracts';
import type { ISODate, MinorUnits } from '@money-level/contracts';
import { addMinorUnits, subtractMinorUnits } from '@money-level/finance-core';
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

export function selectPeriodTotals(
  transactions: readonly Transaction[],
  period: DatePeriod,
): PeriodTotals {
  const from = isoDateSchema.parse(period.from);
  const until = isoDateSchema.parse(period.until);
  if (from >= until)
    throw new RangeError('A report period must have a positive duration.');

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
