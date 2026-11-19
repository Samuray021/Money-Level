import type { MinorUnits, UUID } from '@money-level/contracts';
import { addMinorUnits, subtractMinorUnits } from './money.js';
import type { Transaction } from './transaction.js';

export function reduceAccountBalance(
  balance: MinorUnits,
  transaction: Transaction,
  accountId: UUID,
): MinorUnits {
  if (transaction.deletedAt !== undefined) return balance;
  if (
    transaction.kind === 'transfer' &&
    transaction.toAccountId === accountId
  ) {
    return addMinorUnits(balance, transaction.amountMinor);
  }
  if (transaction.accountId !== accountId) return balance;
  return transaction.kind === 'expense' || transaction.kind === 'transfer'
    ? subtractMinorUnits(balance, transaction.amountMinor)
    : addMinorUnits(balance, transaction.amountMinor);
}
