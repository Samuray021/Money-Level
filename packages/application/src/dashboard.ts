import {
  calendarMonthPeriod,
  selectPeriodTotals,
} from '@money-level/analytics';
import { localTransactionDate, systemClock } from '@money-level/contracts';
import type { Clock } from '@money-level/contracts';
import { selectTotalBalance } from '@money-level/finance-core';
import { selectAvailableToSpend } from '@money-level/goals';
import type { UnitOfWork } from './journal-repository.js';

export function getDashboardSummary(
  storage: UnitOfWork,
  clock: Clock = systemClock,
) {
  return storage.read(async (journal) => {
    const profile = await journal.settings.get('profile');
    if (!profile?.onboardingCompleted) {
      throw new RangeError('The profile setup is incomplete.');
    }

    const transactions = await journal.transactions.list();
    const totalMinor = selectTotalBalance(
      await journal.accounts.list(),
      transactions,
    );
    const period = calendarMonthPeriod(
      localTransactionDate(clock.now(), profile.timeZone),
    );
    return {
      currency: profile.baseCurrency,
      period,
      totalMinor,
      ...selectPeriodTotals(transactions, period),
      ...selectAvailableToSpend(
        totalMinor,
        await journal.goals.list(),
        await journal.goalAllocations.list(),
      ),
    };
  });
}
