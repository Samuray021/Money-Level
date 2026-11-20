import {
  localTransactionDate,
  profileSettingsSchema,
  systemClock,
} from '@money-level/contracts';
import type {
  CurrencyCode,
  HumorFrequency,
  ProfileSettings,
} from '@money-level/contracts';
import {
  accountSchema,
  createOpeningEntry,
  parseCurrencyAmount,
} from '@money-level/finance-core';
import type { JournalCommandContext } from './create-transaction.js';
import { seedStarterCategories } from './starter-categories.js';

export interface ProfileSetupInput {
  currency: CurrencyCode;
  name: string;
  kind: 'card' | 'cash';
  timeZone: string;
}

export function initializeProfile(
  context: JournalCommandContext,
  input: ProfileSetupInput,
): Promise<ProfileSettings> {
  return context.storage.write(async (journal) => {
    const existing = await journal.settings.get('profile');
    if (existing) return existing;

    const accounts = await journal.accounts.list();
    if (
      accounts.some(
        (account) =>
          account.deletedAt === undefined &&
          account.currencyCode !== input.currency,
      )
    ) {
      throw new RangeError('Existing accounts must use the profile currency.');
    }
    if (input.kind !== 'card' && input.kind !== 'cash') {
      throw new RangeError('Choose cash or card for the first account.');
    }
    const createdAt = (context.clock ?? systemClock).now().toISOString();
    const account = accountSchema.parse({
      id: context.createId(),
      name: input.name,
      kind: input.kind,
      currencyCode: input.currency,
      archived: false,
      sortOrder: accounts.length,
      createdAt,
      updatedAt: createdAt,
    });
    if (await journal.accounts.get(account.id)) {
      throw new RangeError('The first account identifier is already in use.');
    }
    const profile = profileSettingsSchema.parse({
      id: 'profile',
      locale: 'ru-RU',
      timeZone: input.timeZone,
      baseCurrency: input.currency,
      firstAccountId: account.id,
      onboardingCompleted: false,
    });
    await journal.accounts.put(account);
    await journal.settings.put(profile);
    return profile;
  });
}

export interface FinishOnboardingInput {
  openingAmount: string;
  humorFrequency: HumorFrequency;
  adultHumorConfirmed?: boolean;
  profanityEnabled: boolean;
}

export function finishOnboarding(
  context: JournalCommandContext,
  input: FinishOnboardingInput,
): Promise<ProfileSettings> {
  return context.storage.write(async (journal) => {
    const profile = await journal.settings.get('profile');
    if (!profile)
      throw new RangeError('The first account has not been created yet.');
    if (profile.onboardingCompleted) return profile;

    const account = await journal.accounts.get(profile.firstAccountId);
    if (
      !account ||
      account.deletedAt ||
      account.archived ||
      account.currencyCode !== profile.baseCurrency
    ) {
      throw new RangeError('The first account is unavailable.');
    }
    const amountMinor = parseCurrencyAmount(
      input.openingAmount,
      profile.baseCurrency,
      {
        allowNegative: true,
        allowZero: true,
      },
    );
    const instant = (context.clock ?? systemClock).now();
    const opening = createOpeningEntry(account, {
      id: context.createId(),
      amountMinor,
      transactionDate: localTransactionDate(instant, profile.timeZone),
      createdAt: instant.toISOString(),
    });
    if (await journal.transactions.get(opening.id)) {
      throw new RangeError('The opening entry identifier is already in use.');
    }
    const completed = profileSettingsSchema.parse({
      ...profile,
      onboardingCompleted: true,
      starterCategoriesReady: true,
      humorFrequency: input.humorFrequency,
      adultHumorConfirmed: input.adultHumorConfirmed ?? false,
      profanityEnabled:
        input.adultHumorConfirmed === true &&
        input.humorFrequency !== 'off' &&
        input.profanityEnabled,
    });

    await journal.transactions.put(opening);
    await seedStarterCategories(journal, opening.createdAt);
    await journal.settings.put(completed);
    return completed;
  });
}

export function setBalanceHidden(
  storage: JournalCommandContext['storage'],
  hidden: boolean,
): Promise<ProfileSettings> {
  return storage.write(async ({ settings }) => {
    const profile = await settings.get('profile');
    if (!profile?.onboardingCompleted)
      throw new RangeError('The profile setup is incomplete.');
    if (profile.balanceHidden === hidden) return profile;
    const updated = profileSettingsSchema.parse({
      ...profile,
      balanceHidden: hidden,
    });
    await settings.put(updated);
    return updated;
  });
}
