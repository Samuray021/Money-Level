import {
  addExpense,
  createGoal,
  exportBackup,
  finishOnboarding,
  getAchievementProgress,
  getDashboardSummary,
  initializeProfile,
  mergeBackup,
  noteManualBackup,
  runAchievementRules,
} from '@money-level/application';
import { expect, test } from 'vitest';
import { exampleId, instant, journalFixture } from './fixtures.js';
import { sha256Checksum } from './index.js';

async function initial() {
  const { open } = journalFixture();
  const storage = open();
  let index = 100;
  const clock = { now: () => new Date(instant) };
  const context = {
    storage,
    clock,
    baseCurrency: 'RUB',
    createId: () => exampleId(index++),
  };
  const { firstAccountId } = await initializeProfile(context, {
    currency: 'RUB',
    name: 'Карта',
    kind: 'card',
    timeZone: 'Europe/Moscow',
  });
  await finishOnboarding(context, {
    openingAmount: '1000',
    humorFrequency: 'off',
    profanityEnabled: false,
  });
  const food = await storage.read(async ({ categories }) =>
    (await categories.list()).find(({ name }) => name === 'Еда'),
  );
  if (!food) throw new Error('Missing starter category.');
  const expense = (date: string, amountMinor: string, key = date) =>
    addExpense(context, {
      accountId: firstAccountId,
      categoryId: food.id,
      amountMinor,
      transactionDate: date,
      idempotencyKey: key,
    });
  return { storage, open, context, expense };
}

test('TC-FIN-005 and TC-FIN-007: command replay and duplicate imports grant XP and debit only once', async () => {
  const { storage, open, context, expense } = await initial();
  const other = open();
  const restored = journalFixture().open();
  try {
    const commands = await Promise.all([
      expense('2026-11-19', '200'),
      expense('2026-11-19', '200'),
    ]);
    expect(commands[0]).toEqual(commands[1]);
    await Promise.all([
      runAchievementRules(context),
      runAchievementRules({ ...context, storage: other }),
    ]);
    await expect(getAchievementProgress(storage)).resolves.toMatchObject({
      totalXp: 10,
      achievements: [{ kind: 'first-operation' }],
    });
    await expect(
      getDashboardSummary(storage, context.clock),
    ).resolves.toMatchObject({ totalMinor: '99800', expenseMinor: '200' });
    const file = JSON.stringify(
      await exportBackup(storage, sha256Checksum, context.clock),
    );
    await mergeBackup(restored, file, sha256Checksum);
    await mergeBackup(restored, file, sha256Checksum);
    await runAchievementRules({ ...context, storage: restored });
    await expect(getAchievementProgress(restored)).resolves.toMatchObject({
      totalXp: 10,
      achievements: [{ kind: 'first-operation' }],
    });
    await expect(
      getDashboardSummary(restored, context.clock),
    ).resolves.toMatchObject({ totalMinor: '99800', expenseMinor: '200' });
  } finally {
    restored.close();
    other.close();
    storage.close();
  }
});

test('useful calendar activity, a first goal and a manual backup award bounded XP regardless of spend', async () => {
  const { storage, context, expense } = await initial();
  try {
    await expect(expense('2026-11-16', '0', 'invalid')).rejects.toThrow();
    await runAchievementRules(context);
    expect((await getAchievementProgress(storage)).totalXp).toBe(0);
    for (let day = 16; day <= 22; day += 1)
      await expense('2026-11-' + day, day === 22 ? '900000' : '1');
    await createGoal(context, { title: 'Подушка', target: '500' });
    await createGoal(context, { title: 'Подарок', target: '100' });
    await noteManualBackup(context);
    await noteManualBackup(context);
    await runAchievementRules(context);
    await runAchievementRules(context);
    const progress = await getAchievementProgress(storage);
    expect(progress.totalXp).toBe(65);
    expect(progress.level).toBe(3);
    expect(progress.achievements.map(({ kind }) => kind).sort()).toEqual([
      'first-backup',
      'first-goal',
      'first-operation',
      'weekly-journal',
    ]);
  } finally {
    storage.close();
  }
});
