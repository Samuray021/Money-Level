import {
  localTransactionDate,
  systemClock,
  uuidSchema,
} from '@money-level/contracts';
import type { AccountKind, UUID } from '@money-level/contracts';
import {
  accountSchema,
  createOpeningEntry,
  parseCurrencyAmount,
  compareMinorUnits,
  selectBalances,
} from '@money-level/finance-core';
import type { Account } from '@money-level/finance-core';
import type { JournalCommandContext } from './create-transaction.js';
import type { UnitOfWork } from './journal-repository.js';

export interface NewAccountInput {
  name: string;
  kind: AccountKind;
  openingAmount: string;
}

export function createAccount(
  context: JournalCommandContext,
  input: NewAccountInput,
): Promise<Account> {
  return context.storage.write(async (journal) => {
    const profile = await journal.settings.get('profile');
    if (!profile?.onboardingCompleted)
      throw new RangeError('The profile setup is incomplete.');

    const now = (context.clock ?? systemClock).now();
    const time = now.toISOString();
    const sortOrder =
      (await journal.accounts.list()).reduce(
        (max, account) => Math.max(max, account.sortOrder),
        -1,
      ) + 1;
    const account = accountSchema.parse({
      id: context.createId(),
      name: input.name,
      kind: input.kind,
      currencyCode: profile.baseCurrency,
      archived: false,
      sortOrder,
      createdAt: time,
      updatedAt: time,
    });
    const opening = createOpeningEntry(account, {
      id: context.createId(),
      amountMinor: parseCurrencyAmount(
        input.openingAmount,
        profile.baseCurrency,
        { allowNegative: true, allowZero: true },
      ),
      transactionDate: localTransactionDate(now, profile.timeZone),
      createdAt: time,
    });
    if (
      (await journal.accounts.get(account.id)) ||
      (await journal.transactions.get(opening.id))
    ) {
      throw new RangeError('The new account identifiers are already in use.');
    }
    await journal.accounts.put(account);
    await journal.transactions.put(opening);
    return account;
  });
}

export function renameAccount(
  context: JournalCommandContext,
  id: UUID,
  name: string,
): Promise<Account> {
  return context.storage.write(async (journal) => {
    const account = await journal.accounts.get(uuidSchema.parse(id));
    if (!account || account.deletedAt || account.archived)
      throw new RangeError('The account cannot be edited.');
    const updated = accountSchema.parse({
      ...account,
      name,
      updatedAt: (context.clock ?? systemClock).now().toISOString(),
    });
    await journal.accounts.put(updated);
    return updated;
  });
}

export function archiveAccount(
  context: JournalCommandContext,
  id: UUID,
): Promise<void> {
  return context.storage.write(async (journal) => {
    const account = await journal.accounts.get(uuidSchema.parse(id));
    if (!account || account.deletedAt || account.archived) return;
    await journal.accounts.put({
      ...account,
      archived: true,
      updatedAt: (context.clock ?? systemClock).now().toISOString(),
    });
  });
}

export function getAccountOverview(storage: UnitOfWork) {
  return storage.read(async (journal) => {
    const accounts = await journal.accounts.list();
    const { byAccount } = selectBalances(
      accounts,
      await journal.transactions.list(),
    );
    return accounts
      .filter((account) => !account.deletedAt)
      .sort(
        (left, right) =>
          Number(left.archived) - Number(right.archived) ||
          left.sortOrder - right.sortOrder ||
          left.id.localeCompare(right.id),
      )
      .map((account) => {
        const balance = byAccount.get(account.id) ?? '0';
        return {
          account,
          balance,
          overdrawn: compareMinorUnits(balance, '0') < 0,
        };
      });
  });
}
