import type { MinorUnits, UUID } from '@money-level/contracts';
import type { Account } from './account.js';
import { addMinorUnits, subtractMinorUnits } from './money.js';
import type { Transaction } from './transaction.js';

interface BalancePosting {
  accountId: UUID;
  deltaMinor: MinorUnits;
}

export function getBalancePostings(
  transaction: Transaction,
): readonly BalancePosting[] {
  if (transaction.deletedAt !== undefined) return [];

  const { accountId, amountMinor } = transaction;
  switch (transaction.kind) {
    case 'transfer':
      return [
        { accountId, deltaMinor: subtractMinorUnits('0', amountMinor) },
        { accountId: transaction.toAccountId, deltaMinor: amountMinor },
      ];
    case 'expense':
      return [{ accountId, deltaMinor: subtractMinorUnits('0', amountMinor) }];
    default:
      return [{ accountId, deltaMinor: amountMinor }];
  }
}

export function reduceAccountBalance(
  balance: MinorUnits,
  transaction: Transaction,
  accountId: UUID,
): MinorUnits {
  const posting = getBalancePostings(transaction).find(
    (entry) => entry.accountId === accountId,
  );
  return posting ? addMinorUnits(balance, posting.deltaMinor) : balance;
}

export function selectAccountBalance(
  transactions: readonly Transaction[],
  accountId: UUID,
): MinorUnits {
  return transactions.reduce(
    (balance, transaction) =>
      reduceAccountBalance(balance, transaction, accountId),
    '0',
  );
}

export function selectTotalBalance(
  accounts: readonly Account[],
  transactions: readonly Transaction[],
): MinorUnits {
  const accountIds = new Set(
    accounts
      .filter((account) => account.deletedAt === undefined)
      .map((account) => account.id),
  );
  let total: MinorUnits = '0';
  for (const transaction of transactions) {
    for (const posting of getBalancePostings(transaction)) {
      if (accountIds.has(posting.accountId)) {
        total = addMinorUnits(total, posting.deltaMinor);
      }
    }
  }
  return total;
}
