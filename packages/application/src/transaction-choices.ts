import type { CategoryType } from '@money-level/contracts';
import { normalizeCategoryName } from '@money-level/finance-core';
import type { Transaction } from '@money-level/finance-core';
import type { UnitOfWork } from './journal-repository.js';

export function getTransactionChoices(storage: UnitOfWork, kind: CategoryType) {
  return storage.read(async (journal) => {
    const profile = await journal.settings.get('profile');
    if (!profile?.onboardingCompleted)
      throw new RangeError('The profile setup is incomplete.');
    const accounts = (await journal.accounts.list())
      .filter(
        (account) =>
          !account.archived &&
          !account.deletedAt &&
          account.currencyCode === profile.baseCurrency,
      )
      .sort(
        (left, right) =>
          left.sortOrder - right.sortOrder || left.id.localeCompare(right.id),
      );
    const categories = (await journal.categories.list()).filter(
      (category) =>
        category.type === kind && !category.archived && !category.deletedAt,
    );
    const accountIds = new Set(accounts.map((account) => account.id));
    const recent = (await journal.transactions.list()).reduce<
      Transaction | undefined
    >((last, transaction) => {
      if (
        transaction.deletedAt ||
        transaction.kind === 'opening' ||
        transaction.kind === 'adjustment' ||
        !accountIds.has(transaction.accountId)
      )
        return last;
      return !last || transaction.createdAt >= last.createdAt
        ? transaction
        : last;
    }, undefined);
    const defaultCategory =
      categories.find(
        (category) => normalizeCategoryName(category.name) === 'другое',
      ) ?? categories[0];
    return {
      profile,
      accounts,
      categories,
      accountId: recent?.accountId ?? accounts[0]?.id ?? '',
      categoryId: defaultCategory?.id ?? '',
    };
  });
}
