import {
  addExpense,
  addIncome,
  claimBudgetNotices,
  claimGoalCompletionNotices,
  createAccount,
  createGoal,
  exportBackup,
  finishOnboarding,
  getAchievementProgress,
  initializeProfile,
  mergeBackup,
  noteManualBackup,
  recordAnalyticsOpened,
  recordAppSession,
  replaceBackup,
  reserveToGoal,
  runAchievementRules,
  runMemeReactions,
  saveBudget,
  transfer,
} from '@money-level/application';
import { domainEventSchema } from '@money-level/contracts';
import { expect, test } from 'vitest';
import { day, exampleId, instant, journalFixture } from './fixtures.js';
import { sha256Checksum } from './index.js';

async function openJournal() {
  const { open } = journalFixture();
  const storage = open();
  let next = 100;
  const context = {
    storage,
    baseCurrency: 'RUB',
    clock: { now: () => new Date(instant) },
    createId: () => exampleId(next++),
  };
  const profile = await initializeProfile(context, {
    currency: 'RUB',
    name: 'Карта',
    kind: 'card',
    timeZone: 'Europe/Moscow',
  });
  await finishOnboarding(context, {
    openingAmount: '100',
    humorFrequency: 'usual',
    profanityEnabled: false,
  });
  const categories = await storage.read((journal) => journal.categories.list());
  const expense = categories.find((category) => category.type === 'expense')!;
  const income = categories.find((category) => category.type === 'income')!;
  return { context, open, accountId: profile.firstAccountId, expense, income };
}

test('committed producers persist typed, private events and deduplicate on retry, restart and restoration', async () => {
  const { context, open, accountId, expense, income } = await openJournal();
  const { storage } = context;
  const restarted = open();
  const restored = journalFixture().open();
  const session = { id: exampleId(701), startedAt: Date.parse(instant) };
  try {
    const reopenReports = () =>
      Promise.all([
        recordAppSession(context, session.id),
        recordAnalyticsOpened(context, session.id, 'month', '2026-11-01'),
        recordAnalyticsOpened(context, session.id, 'week', '2026-11-16'),
      ]);
    await Promise.all([reopenReports(), reopenReports()]);

    const cash = await createAccount(context, {
      name: 'Наличные',
      kind: 'cash',
      openingAmount: '0',
    });
    const input = { accountId, transactionDate: day, amountMinor: '301' };
    await addIncome(context, {
      ...input,
      categoryId: income.id,
      idempotencyKey: 'income',
    });
    await transfer(context, {
      ...input,
      toAccountId: cash.id,
      idempotencyKey: 'transfer',
    });
    const budget = await saveBudget(context, {
      amount: '2',
      active: true,
      categoryId: expense.id,
    });
    const purchase = {
      ...input,
      categoryId: expense.id,
      idempotencyKey: 'expense',
      note: 'Синтетическая заметка для проверки приватности',
    };
    await Promise.all([
      addExpense(context, purchase),
      addExpense(context, purchase),
    ]);
    await expect(
      claimBudgetNotices({ ...context, createId: () => session.id }),
    ).rejects.toThrow();
    const claimed = await Promise.all([
      claimBudgetNotices(context),
      claimBudgetNotices(context),
    ]);
    expect(claimed.flat()).toEqual([
      { id: budget.id, label: expense.name, threshold: 'over' },
    ]);

    const goal = await createGoal(context, {
      title: 'Синтетическая цель',
      target: '7',
    });
    const reserve = {
      goalId: goal.id,
      amountMinor: '700',
      allocationId: exampleId(702),
    };
    await expect(
      reserveToGoal(context, { ...reserve, amountMinor: '701' }),
    ).rejects.toThrow();
    const allocations = await Promise.all([
      reserveToGoal(context, reserve),
      reserveToGoal(context, reserve),
    ]);
    expect(allocations[0]).toEqual(allocations[1]);

    await exportBackup(storage, sha256Checksum, context.clock);
    const exportId = exampleId(703);
    await Promise.all([
      noteManualBackup(context, exportId),
      noteManualBackup(context, exportId),
    ]);
    await runAchievementRules(context);
    await runAchievementRules({ ...context, storage: restarted });
    expect((await getAchievementProgress(storage)).totalXp).toBe(45);

    const events = await storage.read(({ outbox }) => outbox.list());
    expect(events.map(({ type }) => type).sort()).toEqual([
      'achievement.unlocked',
      'achievement.unlocked',
      'achievement.unlocked',
      'analytics.monthly.opened',
      'analytics.weekly.opened',
      'app.session.started',
      'backup.exported',
      'budget.threshold.reached',
      'budget.threshold.reached',
      'budget.threshold.reached',
      'goal.completed',
      'goal.created',
      'goal.progress.updated',
      'transaction.expense.created',
      'transaction.income.created',
      'transaction.transfer.created',
    ]);
    expect(
      events
        .filter((event) => event.type === 'budget.threshold.reached')
        .map((event) => event.payload.budgetThreshold)
        .sort(),
    ).toEqual(['100', '80', 'over']);
    expect(
      events.filter((event) => event.type === 'goal.progress.updated'),
    ).toMatchObject([
      {
        eventId: reserve.allocationId,
        sourceEntityId: goal.id,
        payload: { action: 'reserve' },
      },
    ]);
    expect(
      events.every((event) => domainEventSchema.safeParse(event).success),
    ).toBe(true);
    expect(JSON.stringify(events)).not.toContain(purchase.note);
    expect(JSON.stringify(events)).not.toContain(goal.title);

    const notices = await Promise.all([
      claimGoalCompletionNotices(context, session.startedAt),
      claimGoalCompletionNotices(
        { ...context, storage: restarted },
        session.startedAt,
      ),
    ]);
    expect(notices.reduce((total, count) => total + count, 0)).toBe(1);

    const random = { next: () => 0.5 };
    await runMemeReactions(context, session, random);
    expect(
      await runMemeReactions(
        { ...context, storage: restarted },
        session,
        random,
      ),
    ).toEqual([]);
    const file = JSON.stringify(
      await exportBackup(storage, sha256Checksum, context.clock),
    );
    const recovery = { ...context, storage: restored };
    await replaceBackup(recovery, file, sha256Checksum, true);
    await mergeBackup(restored, file, sha256Checksum);
    await recordAppSession(recovery, session.id);
    await recordAnalyticsOpened(recovery, session.id, 'week', '2026-11-16');
    await claimBudgetNotices(recovery);
    expect(await claimGoalCompletionNotices(recovery, session.startedAt)).toBe(
      0,
    );
    await reserveToGoal(recovery, reserve);
    await runAchievementRules(recovery);
    expect(await runMemeReactions(recovery, session, random)).toEqual([]);
    expect(await restored.read(({ outbox }) => outbox.list())).toEqual(events);
    expect((await getAchievementProgress(restored)).totalXp).toBe(45);
  } finally {
    storage.close();
    restarted.close();
    restored.close();
  }
});

test('a real eligible rare reaction records one easter egg, keeps its receipt and cannot recurse', async () => {
  const { context, open, accountId, expense } = await openJournal();
  const { storage } = context;
  const reopened = open();
  const session = { id: exampleId(705), startedAt: Date.parse(instant) };
  try {
    await recordAppSession(context, session.id);
    await addExpense(context, {
      accountId,
      categoryId: expense.id,
      amountMinor: '1',
      transactionDate: day,
      idempotencyKey: 'eligible-event',
    });
    const picked = await runMemeReactions(context, session, { next: () => 0 });
    expect(picked).toHaveLength(2);
    expect(picked.find((reaction) => reaction.ambient)).toMatchObject({
      ruleId: 'session-ready',
    });
    expect(picked.find((reaction) => !reaction.ambient)).toMatchObject({
      rarity: 'rare',
    });

    const replay = { ...context, storage: reopened };
    expect(await runMemeReactions(replay, session, { next: () => 0 })).toEqual(
      [],
    );
    await runAchievementRules(replay);
    expect(await runMemeReactions(replay, session, { next: () => 0 })).toEqual(
      [],
    );
    const snapshot = await storage.read(
      async ({ outbox, memeShown, eventReceipts }) => ({
        events: await outbox.list(),
        shown: await memeShown.list(),
        receipts: await eventReceipts.list(),
      }),
    );
    const egg = snapshot.events.filter(
      ({ type }) => type === 'easter_egg.triggered',
    );
    expect(egg).toHaveLength(1);
    expect(egg[0]).toMatchObject({
      sourceEntityId: snapshot.shown[0]?.id,
      payload: { cause: 'rare-reaction' },
    });
    expect(snapshot.shown).toHaveLength(1);
    expect(snapshot.receipts).toContainEqual(
      expect.objectContaining({
        eventId: egg[0]?.eventId,
        consumer: 'meme-engine',
      }),
    );
    expect((await getAchievementProgress(storage)).totalXp).toBe(10);
  } finally {
    reopened.close();
    storage.close();
  }
});
