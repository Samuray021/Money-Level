import {
  addExpense,
  finishOnboarding,
  initializeProfile,
  runMemeReactions,
} from '@money-level/application';
import { selectTotalBalance } from '@money-level/finance-core';
import { expect, test } from 'vitest';
import { day, exampleId, instant, journalFixture } from './fixtures.js';

async function setup(frequency: 'off' | 'usual') {
  const { open } = journalFixture();
  const storage = open();
  let id = 100;
  const clock = { now: () => new Date(instant) };
  const context = {
    storage,
    clock,
    baseCurrency: 'RUB',
    createId: () => exampleId(id++),
  };
  const settings = await initializeProfile(context, {
    currency: 'RUB',
    name: 'Карта',
    kind: 'card',
    timeZone: 'Europe/Moscow',
  });
  await finishOnboarding(context, {
    openingAmount: '500',
    humorFrequency: frequency,
    profanityEnabled: false,
  });
  const expenseCategory = await storage.read(async ({ categories }) =>
    (await categories.list()).find((item) => item.type === 'expense'),
  );
  if (!expenseCategory) throw new Error('Expected an expense category.');
  await addExpense(context, {
    accountId: settings.firstAccountId,
    categoryId: expenseCategory.id,
    transactionDate: day,
    amountMinor: '10000',
    idempotencyKey: 'expense',
  });
  const session = { id: exampleId(1), startedAt: Date.parse(instant) };
  const evaluate = (db = storage, input?: unknown) =>
    runMemeReactions(db, session, { next: () => 0.5 }, clock, input);
  const finance = () =>
    storage.read(async (journal) => {
      const transactions = await journal.transactions.list();
      return {
        transactions,
        balance: selectTotalBalance(
          await journal.accounts.list(),
          transactions,
        ),
      };
    });
  return { storage, open, evaluate, finance };
}

test('TC-FIN-008: disabling humor leaves the saved financial entry and balance intact', async () => {
  const { storage, evaluate, finance } = await setup('off');
  try {
    const before = await finance();
    expect(before.balance).toBe('40000');
    expect(await evaluate()).toEqual([]);
    expect(await finance()).toEqual(before);
    expect(await storage.read((journal) => journal.memeShown.list())).toEqual(
      [],
    );
  } finally {
    storage.close();
  }
});

test('a malformed pack is ignored, and concurrent replay shows at most one reaction', async () => {
  const { storage, open, evaluate, finance } = await setup('usual');
  const parallel = open();
  try {
    const before = await finance();
    expect(
      await evaluate(storage, { id: 'broken', rules: [{ text: '<script>' }] }),
    ).toEqual([]);
    expect(
      await storage.read((journal) => journal.eventReceipts.list()),
    ).toEqual([]);
    const reactions = await Promise.all([evaluate(), evaluate(parallel)]);
    expect(reactions.flat()).toHaveLength(1);
    expect(await evaluate()).toEqual([]);
    expect(await finance()).toEqual(before);
    expect(
      await storage.read((journal) => journal.memeShown.list()),
    ).toHaveLength(1);
  } finally {
    parallel.close();
    storage.close();
  }
});
