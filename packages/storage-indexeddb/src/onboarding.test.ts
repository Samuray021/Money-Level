import { finishOnboarding, initializeProfile } from '@money-level/application';
import { selectAccountBalance } from '@money-level/finance-core';
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

test('records one signed opening with the profile time zone and retries safely on reopen', async () => {
  const { open } = journalFixture();
  const storage = open();
  const parallel = open();
  const clock = { now: () => new Date('2026-11-19T23:45:00.000Z') };
  const start = { storage, clock, createId: () => exampleId(20) };
  const settings = await initializeProfile(start, {
    ...input,
    currency: 'RUB',
  });
  const completion = {
    openingAmount: '-450,50',
    humorFrequency: 'off',
    profanityEnabled: true,
  } as const;
  try {
    await expect(
      finishOnboarding(
        { ...start, createId: () => exampleId(55) },
        { ...completion, openingAmount: '1.001' },
      ),
    ).rejects.toThrow(RangeError);
    expect(
      await storage.read((journal) => journal.transactions.list()),
    ).toEqual([]);
    const actual = await Promise.all([
      finishOnboarding({ ...start, createId: () => exampleId(22) }, completion),
      finishOnboarding(
        { ...start, storage: parallel, createId: () => exampleId(23) },
        completion,
      ),
    ]);
    expect(actual[0]).toEqual(actual[1]);
    expect(actual[0]).toMatchObject({
      onboardingCompleted: true,
      humorFrequency: 'off',
      profanityEnabled: false,
    });
  } finally {
    storage.close();
    parallel.close();
  }

  const reopened = open();
  try {
    const repeat = await finishOnboarding(
      { ...start, storage: reopened },
      { ...completion, openingAmount: '9999' },
    );
    expect(repeat.onboardingCompleted).toBe(true);
    const transactions = await reopened.read((journal) =>
      journal.transactions.list(),
    );
    expect(transactions).toMatchObject([
      {
        kind: 'opening',
        amountMinor: '-45050',
        accountId: settings.firstAccountId,
        transactionDate: '2026-11-20',
      },
    ]);
    expect(selectAccountBalance(transactions, settings.firstAccountId)).toBe(
      '-45050',
    );
  } finally {
    reopened.close();
  }
});
