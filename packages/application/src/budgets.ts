import {
  calendarMonthPeriod,
  selectCategoryExpenses,
  selectPeriodTotals,
} from '@money-level/analytics';
import { budgetSchema, budgetUsageForSpent } from '@money-level/budgets';
import type { Budget, BudgetThreshold } from '@money-level/budgets';
import {
  localTransactionDate,
  profileSettingsSchema,
  systemClock,
  uuidSchema,
} from '@money-level/contracts';
import type { Clock, ProfileSettings, UUID } from '@money-level/contracts';
import { parseCurrencyAmount } from '@money-level/finance-core';
import type { JournalCommandContext } from './create-transaction.js';
import type { JournalReader, UnitOfWork } from './journal-repository.js';

export interface BudgetInput {
  id?: UUID;
  categoryId?: UUID;
  amount: string;
  active: boolean;
}

export function saveBudget(
  context: JournalCommandContext,
  input: BudgetInput,
): Promise<Budget> {
  return context.storage.write(async (journal) => {
    const profile = await journal.settings.get('profile');
    if (!profile?.onboardingCompleted)
      throw new RangeError('The profile setup is incomplete.');
    const id = uuidSchema.parse(input.id ?? context.createId());
    const existing = await journal.budgets.get(id);
    if (Boolean(existing) !== Boolean(input.id))
      throw new RangeError('The budget ID does not match the operation.');
    const categoryId = input.categoryId
      ? uuidSchema.parse(input.categoryId)
      : undefined;
    if (categoryId) {
      const category = await journal.categories.get(categoryId);
      if (
        !category ||
        category.type !== 'expense' ||
        ((category.archived || category.deletedAt) &&
          existing?.categoryId !== categoryId)
      )
        throw new RangeError('Choose an expense category.');
    }
    if (
      input.active &&
      (await journal.budgets.list()).some(
        (row) => row.id !== id && row.active && row.categoryId === categoryId,
      )
    )
      throw new RangeError('An active budget already uses this scope.');

    const now = (context.clock ?? systemClock).now().toISOString();
    const budget = budgetSchema.parse({
      id,
      periodType: 'month',
      ...(categoryId ? { categoryId } : {}),
      limitMinor: parseCurrencyAmount(
        input.amount.trim(),
        profile.baseCurrency,
      ),
      active: input.active,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    await journal.budgets.put(budget);
    return budget;
  });
}

async function readBudgets(journal: JournalReader, clock: Clock) {
  const profile = await journal.settings.get('profile');
  if (!profile?.onboardingCompleted)
    throw new RangeError('The profile setup is incomplete.');
  const period = calendarMonthPeriod(
    localTransactionDate(clock.now(), profile.timeZone),
  );
  const budgets = await journal.budgets.list();
  const categories = (await journal.categories.list()).filter(
    ({ type }) => type === 'expense',
  );
  const names = new Map(
    categories.map((category) => [category.id, category.name]),
  );
  const transactions = budgets.length ? await journal.transactions.list() : [];
  const byCategory = new Map(
    selectCategoryExpenses(transactions, period).map(
      ({ categoryId, amountMinor }) => [categoryId, amountMinor],
    ),
  );
  const { expenseMinor } = selectPeriodTotals(transactions, period);
  const notices = budgets.length ? await journal.budgetNotices.list() : [];
  const notified = new Map<UUID, BudgetThreshold[]>();
  for (const { budgetId, monthStart, threshold } of notices) {
    if (monthStart !== period.from) continue;
    const sent = notified.get(budgetId) ?? [];
    sent.push(threshold);
    notified.set(budgetId, sent);
  }
  return {
    period,
    categories,
    enabled: profile.budgetNotificationsEnabled,
    rows: budgets.map((budget) => ({
      budget,
      name: budget.categoryId
        ? (names.get(budget.categoryId) ?? 'Категория недоступна')
        : 'Все расходы',
      ...budgetUsageForSpent(
        budget,
        budget.categoryId
          ? (byCategory.get(budget.categoryId) ?? '0')
          : expenseMinor,
        notified.get(budget.id),
      ),
    })),
  };
}

export function getBudgetOverview(
  storage: UnitOfWork,
  clock: Clock = systemClock,
) {
  return storage.read((journal) => readBudgets(journal, clock));
}

export function claimBudgetNotices(
  storage: UnitOfWork,
  clock: Clock = systemClock,
) {
  return storage.write(async (journal) => {
    const overview = await readBudgets(journal, clock);
    if (!overview.enabled) return [];

    const claimed: { id: string; label: string; threshold: BudgetThreshold }[] =
      [];
    const createdAt = clock.now().toISOString();
    for (const { budget, name, newThresholds } of overview.rows) {
      for (const threshold of newThresholds) {
        await journal.budgetNotices.put({
          id: [budget.id, overview.period.from, threshold].join(':'),
          budgetId: budget.id,
          monthStart: overview.period.from,
          threshold,
          createdAt,
        });
      }
      const highest = newThresholds.at(-1);
      if (highest)
        claimed.push({ id: budget.id, label: name, threshold: highest });
    }
    return claimed;
  });
}

export function setBudgetNoticesEnabled(
  storage: UnitOfWork,
  enabled: boolean,
): Promise<ProfileSettings> {
  return storage.write(async ({ settings }) => {
    const profile = await settings.get('profile');
    if (!profile?.onboardingCompleted)
      throw new RangeError('The profile setup is incomplete.');
    const updated = profileSettingsSchema.parse({
      ...profile,
      budgetNotificationsEnabled: enabled,
    });
    await settings.put(updated);
    return updated;
  });
}
