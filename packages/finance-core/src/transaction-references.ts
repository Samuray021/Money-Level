import type { CurrencyCode, UUID } from '@money-level/contracts';
import type { Account } from './account.js';
import { assertCategoryType } from './category.js';
import type { Category } from './category.js';
import type { Transaction } from './transaction.js';

interface TransactionReferences {
  baseCurrency: CurrencyCode;
  accounts: readonly Account[];
  categories: readonly Category[];
}

function assertAccount(
  id: UUID,
  currency: CurrencyCode,
  accounts: readonly Account[],
): void {
  const account = accounts.find(
    (entry) => entry.id === id && entry.deletedAt === undefined,
  );
  if (!account) throw new RangeError('The referenced account does not exist.');
  if (account.currencyCode !== currency) {
    throw new RangeError('The account and transaction currencies must match.');
  }
}

export function assertTransactionReferences(
  transaction: Transaction,
  references: TransactionReferences,
): void {
  if (transaction.currencyCode !== references.baseCurrency) {
    throw new RangeError(
      'The transaction currency must match the base currency.',
    );
  }

  assertAccount(
    transaction.accountId,
    transaction.currencyCode,
    references.accounts,
  );
  if (transaction.kind === 'transfer') {
    assertAccount(
      transaction.toAccountId,
      transaction.currencyCode,
      references.accounts,
    );
  }
  if (transaction.kind === 'expense' || transaction.kind === 'income') {
    const category = references.categories.find(
      (entry) =>
        entry.id === transaction.categoryId && entry.deletedAt === undefined,
    );
    if (!category)
      throw new RangeError('The referenced category does not exist.');
    assertCategoryType(category, transaction.kind);
  }
}
