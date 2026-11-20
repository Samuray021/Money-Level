import {
  calendarMonthPeriod,
  calendarWeekPeriod,
  shiftCalendarDate,
  selectCategoryExpenses,
  selectExpenseCount,
  selectMostFrequentExpenseCategory,
  selectPeriodTotals,
} from '@money-level/analytics';
import {
  createSeededRandom,
  localTransactionDate,
  systemClock,
} from '@money-level/contracts';
import type { Clock } from '@money-level/contracts';
import { buildRoastCards } from '@money-level/meme-engine';
import { resolveHumorPolicy } from './humor-settings.js';
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
    const categories = new Map(
      (await journal.categories.list()).map(({ id, name }) => [id, name]),
    );
    const nameOf = (id: string) => categories.get(id) ?? 'Категория недоступна';
    const byAmount = selectCategoryExpenses(transactions, period);
    const [leading] = byAmount;
    const mostFrequent = selectMostFrequentExpenseCategory(
      transactions,
      period,
    );
    const total = BigInt(expenseMinor);
    const categoryShares = byAmount.map(({ categoryId, amountMinor }) => ({
      name: nameOf(categoryId),
      hundredthsPercent: Number(
        (BigInt(amountMinor) * 10_000n + total / 2n) / total,
      ),
    }));
    const { mode } = resolveHumorPolicy(profile);
    const cards = buildRoastCards(
      {
        expenseMinor,
        priorExpenseMinor,
        expenseCount: selectExpenseCount(transactions, period),
        categoryShares,
        ...(mostFrequent
          ? {
              mostFrequentCategory: {
                name: nameOf(mostFrequent.categoryId),
                count: mostFrequent.count,
              },
            }
          : {}),
        ...(leading
          ? {
              leadingCategory: {
                name: nameOf(leading.categoryId),
                amountMinor: leading.amountMinor,
              },
            }
          : {}),
      },
      mode,
      createSeededRandom(seed),
    );
    return {
      kind,
      seed,
      mode,
      period: { from: period.from, to: shiftCalendarDate(period.until, -1) },
      cards,
    };
  });
}
