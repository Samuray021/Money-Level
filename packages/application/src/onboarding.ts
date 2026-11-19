import { profileSettingsSchema, systemClock } from '@money-level/contracts';
import type { CurrencyCode, ProfileSettings } from '@money-level/contracts';
import { accountSchema } from '@money-level/finance-core';
import type { JournalCommandContext } from './create-transaction.js';

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
