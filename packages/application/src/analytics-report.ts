import {
  calendarMonthPeriod,
  selectCategoryExpenses,
  selectExpenseSeries,
  selectPeriodTotals,
  shiftCalendarDate,
} from '@money-level/analytics';
import { uuidSchema } from '@money-level/contracts';
import type { UUID } from '@money-level/contracts';
import type { UnitOfWork } from './journal-repository.js';

export function getAnalyticsReport(
  storage: UnitOfWork,
  month: string,
  account?: UUID,
) {
  const accountId =
    account === undefined ? undefined : uuidSchema.parse(account);
  const period = calendarMonthPeriod(month + '-01');
  const previousPeriod = calendarMonthPeriod(
    shiftCalendarDate(period.from, -1),
  );
  return storage.read(async (journal) => {
    const entries = await journal.transactions.list();
    const transactions = accountId
      ? entries.filter((entry) => entry.accountId === accountId)
      : entries;
    const accounts = (await journal.accounts.list())
      .filter((item) => !item.deletedAt)
      .sort(
        (left, right) =>
          Number(left.archived) - Number(right.archived) ||
          left.sortOrder - right.sortOrder,
      )
      .map(({ id, name, archived }) => ({ id, name, archived }));
    const categories = new Map(
      (await journal.categories.list()).map((item) => [item.id, item.name]),
    );
    return {
      month,
      accountId,
      accounts,
      period,
      totals: selectPeriodTotals(transactions, period),
      previousTotals: selectPeriodTotals(transactions, previousPeriod),
      byCategory: selectCategoryExpenses(transactions, period).map((row) => ({
        ...row,
        name: categories.get(row.categoryId) ?? 'Категория недоступна',
      })),
      daily: selectExpenseSeries(transactions, period, 'day'),
    };
  });
}
