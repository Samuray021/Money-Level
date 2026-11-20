import {
  calendarMonthPeriod,
  calendarWeekPeriod,
  shiftCalendarDate,
  selectCategoryExpenses,
  selectExpenseCount,
  selectPeriodTotals,
} from '@money-level/analytics';
import {
  createSeededRandom,
  localTransactionDate,
  systemClock,
} from '@money-level/contracts';
import type { Clock } from '@money-level/contracts';
import { buildRoastCards } from '@money-level/meme-engine';
import type { UnitOfWork } from './journal-repository.js';

export type RoastPeriod = 'week' | 'month';

export function getRoastReport(
  storage: UnitOfWork,
  kind: RoastPeriod,
  seed: number,
  clock: Clock = systemClock,
) {
  return storage.read(async (journal) => {
    const profile = await journal.settings.get('profile');
    if (!profile?.onboardingCompleted)
      throw new RangeError('The profile setup is incomplete.');
    const today = localTransactionDate(clock.now(), profile.timeZone);
    const select = kind === 'week' ? calendarWeekPeriod : calendarMonthPeriod;
    const period = select(today);
    const previous = select(shiftCalendarDate(period.from, -1));
    const transactions = await journal.transactions.list();
    const { expenseMinor } = selectPeriodTotals(transactions, period);
    const priorExpenseMinor = selectPeriodTotals(
      transactions,
      previous,
    ).expenseMinor;
    const leading = selectCategoryExpenses(transactions, period)[0];
    const category = leading
      ? await journal.categories.get(leading.categoryId)
      : undefined;
    const cards = buildRoastCards(
      {
        expenseMinor,
        priorExpenseMinor,
        expenseCount: selectExpenseCount(transactions, period),
        ...(leading
          ? {
              leadingCategory: {
                name: category?.name ?? 'Категория недоступна',
                amountMinor: leading.amountMinor,
              },
            }
          : {}),
      },
      profile.humorFrequency === 'off' ? 'off' : profile.humorMode,
      createSeededRandom(seed),
    );
    return {
      kind,
      seed,
      period: { from: period.from, to: shiftCalendarDate(period.until, -1) },
      cards,
    };
  });
}
