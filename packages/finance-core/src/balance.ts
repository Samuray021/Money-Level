import type { MinorUnits, UUID } from '@money-level/contracts';
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
