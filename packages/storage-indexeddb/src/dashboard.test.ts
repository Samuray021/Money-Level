import {
  addExpense,
  addIncome,
  finishOnboarding,
  getDashboardSummary,
  initializeProfile,
  reserveToGoal,
} from '@money-level/application';
import { expect, test } from 'vitest';
import {
  category,
  exampleId,
  instant,
  journalFixture,
  salary,
} from './fixtures.js';

test('dashboard uses the live journal and actual reserves in the profile month', async () => {
  const storage = journalFixture().open();
  const clock = { now: () => new Date('2026-10-31T22:30:00.000Z') };
  let sequence = 100;
  const context = {
    storage,
    clock,
    baseCurrency: 'RUB',
    createId: () => exampleId(sequence++),
  };
  try {
    await expect(getDashboardSummary(storage, clock)).rejects.toThrow(
      RangeError,
    );
    const profile = await initializeProfile(context, {
      currency: 'RUB',
      name: 'Карта',
      kind: 'card',
      timeZone: 'Europe/Moscow',
    });
    await finishOnboarding(context, {
      openingAmount: '10000',
      humorFrequency: 'off',
      profanityEnabled: false,
    });
    const goalId = exampleId(15);
    await storage.write(async (journal) => {
      await journal.categories.put(category);
      await journal.categories.put(salary);
      await journal.goals.put({
        id: goalId,
        title: 'Компьютер',
        targetMinor: '7000000',
        status: 'active',
        icon: 'target',
        createdAt: instant,
        updatedAt: instant,
      });
    });
    const fields = {
      accountId: profile.firstAccountId,
      transactionDate: '2026-11-01',
    };
    await addIncome(context, {
      ...fields,
      categoryId: salary.id,
      amountMinor: '5000000',
      idempotencyKey: 'income',
    });
    await addExpense(context, {
      ...fields,
      categoryId: category.id,
      amountMinor: '130000',
      idempotencyKey: 'expense',
    });
    await addExpense(context, {
      ...fields,
      transactionDate: '2026-10-31',
      categoryId: category.id,
      amountMinor: '20000',
      idempotencyKey: 'prior',
    });
    await reserveToGoal(context, { goalId, amountMinor: '500000' });
    await expect(getDashboardSummary(storage, clock)).resolves.toEqual({
      currency: 'RUB',
      period: { from: '2026-11-01', until: '2026-12-01' },
      totalMinor: '5850000',
      incomeMinor: '5000000',
      expenseMinor: '130000',
      netMinor: '4870000',
      reservedMinor: '500000',
      availableMinor: '5350000',
      overReserved: false,
    });
  } finally {
    storage.close();
  }
});
