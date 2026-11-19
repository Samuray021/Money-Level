import { initializeProfile } from '@money-level/application';
import { expect, test } from 'vitest';
import { exampleId, instant, journalFixture } from './fixtures.js';

const input = {
  currency: 'JPY',
  name: ' Наличные ',
  kind: 'cash',
  timeZone: 'Europe/Moscow',
} as const;

test('chooses one base currency and account across concurrent onboarding requests', async () => {
  const { open } = journalFixture();
  const storage = open();
  const second = open();
  const clock = { now: () => new Date(instant) };
  try {
    const [before, after] = await Promise.all([
      initializeProfile(
        { storage, clock, createId: () => exampleId(20) },
        input,
      ),
      initializeProfile(
        { storage: second, clock, createId: () => exampleId(21) },
        input,
      ),
    ]);
    expect(before).toEqual(after);
    expect(before).toMatchObject({
      baseCurrency: 'JPY',
      onboardingCompleted: false,
    });
    await storage.read(async (journal) => {
      expect(await journal.accounts.list()).toMatchObject([
        { name: 'Наличные', currencyCode: 'JPY', kind: 'cash' },
      ]);
      expect(await journal.transactions.list()).toEqual([]);
    });
  } finally {
    storage.close();
    second.close();
  }
});

test('invalid setup leaves the journal empty', async () => {
  const storage = journalFixture().open();
  const context = { storage, createId: () => exampleId(42) };
  try {
    await expect(
      initializeProfile(context, { ...input, timeZone: 'No/Such_Zone' }),
    ).rejects.toThrow();
    await storage.read(async (journal) => {
      expect(await journal.accounts.list()).toEqual([]);
      expect(await journal.settings.get('profile')).toBeUndefined();
    });
  } finally {
    storage.close();
  }
});
