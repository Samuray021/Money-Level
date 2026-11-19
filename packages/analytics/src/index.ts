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

  let incomeMinor: MinorUnits = '0';
  let expenseMinor: MinorUnits = '0';
  for (const entry of transactions) {
    if (
      entry.deletedAt ||
      entry.transactionDate < from ||
      entry.transactionDate >= until
    )
      continue;
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
