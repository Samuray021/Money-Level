import {
  calendarMonthPeriod,
  selectCategoryExpenses,
  selectExpenseSeries,
  selectPeriodTotals,
} from '@money-level/analytics';
import type { UnitOfWork } from './journal-repository.js';

export function getAnalyticsReport(storage: UnitOfWork, month: string) {
  return storage.read(async (journal) => {
    const period = calendarMonthPeriod(month + '-01');
    const previousMonth = new Date(period.from + 'T00:00:00.000Z');
    previousMonth.setUTCMonth(previousMonth.getUTCMonth() - 1);
    const previousPeriod = calendarMonthPeriod(
      previousMonth.toISOString().slice(0, 10),
    );
    const transactions = await journal.transactions.list();
    const categories = new Map(
      (await journal.categories.list()).map((item) => [item.id, item.name]),
    );
    return {
      month,
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
