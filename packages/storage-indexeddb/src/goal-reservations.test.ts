import {
  finishOnboarding,
  initializeProfile,
  releaseFromGoal,
  reserveToGoal,
} from '@money-level/application';
import { selectTotalBalance } from '@money-level/finance-core';
import { selectAvailableToSpend } from '@money-level/goals';
import { expect, test } from 'vitest';
import { exampleId, instant, journalFixture } from './fixtures.js';

const goal = {
  id: exampleId(1),
  title: 'Компьютер',
  icon: 'target',
  targetMinor: '7000000',
  status: 'active',
  createdAt: instant,
  updatedAt: instant,
} as const;

async function setup() {
  const { open } = journalFixture();
  const storage = open();
  let sequence = 100;
  const context = {
    storage,
    createId: () => exampleId(sequence++),
    clock: { now: () => new Date(instant) },
  };
  await initializeProfile(context, {
    currency: 'RUB',
    name: 'Карта',
    kind: 'card',
    timeZone: 'Europe/Moscow',
  });
  await finishOnboarding(context, {
    openingAmount: '58700',
    humorFrequency: 'off',
    profanityEnabled: false,
  });
  await storage.write((journal) => journal.goals.put(goal));
  return { open, storage, context };
}

test('TC-FIN-001/004: reserve and release move available money without changing the total or journal', async () => {
  const { storage, context } = await setup();
  const balances = () =>
    storage.read(async (journal) => {
      const transactions = await journal.transactions.list();
      const total = selectTotalBalance(
        await journal.accounts.list(),
        transactions,
      );
      const { reservedMinor, availableMinor } = selectAvailableToSpend(
        total,
        await journal.goals.list(),
        await journal.goalAllocations.list(),
      );
      return {
        total,
        reserved: reservedMinor,
        available: availableMinor,
        count: transactions.length,
      };
    });
  try {
    await reserveToGoal(context, { goalId: goal.id, amountMinor: '500000' });
    expect(await balances()).toEqual({
      total: '5870000',
      reserved: '500000',
      available: '5370000',
      count: 1,
    });
    await releaseFromGoal(context, { goalId: goal.id, amountMinor: '200000' });
    expect(await balances()).toEqual({
      total: '5870000',
      reserved: '300000',
      available: '5570000',
      count: 1,
    });
    await expect(
      releaseFromGoal(context, { goalId: goal.id, amountMinor: '300001' }),
    ).rejects.toThrow(RangeError);
    await expect(
      reserveToGoal(context, { goalId: goal.id, amountMinor: '5570001' }),
    ).rejects.toThrow(RangeError);
  } finally {
    storage.close();
  }
});

test('concurrent reservations do not overshoot the target, and releasing reopens a completed goal', async () => {
  const { storage, context, open } = await setup();
  const parallel = open();
  try {
    await storage.write((journal) =>
      journal.goals.put({ ...goal, targetMinor: '900000' }),
    );
    const input = { goalId: goal.id, amountMinor: '900000' };
    const results = await Promise.allSettled([
      reserveToGoal(context, input),
      reserveToGoal({ ...context, storage: parallel }, input),
    ]);
    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      1,
    );
    expect(
      await storage.read((journal) => journal.goals.get(goal.id)),
    ).toMatchObject({ status: 'completed' });
    await releaseFromGoal(context, { ...input, amountMinor: '1' });
    expect(
      await storage.read((journal) => journal.goals.get(goal.id)),
    ).toMatchObject({ status: 'active' });
  } finally {
    storage.close();
    parallel.close();
  }
});
