import type { DomainEvent, DomainEventType } from '@money-level/contracts';
import { domainEventSchema } from '@money-level/contracts';
import type { Transaction } from '@money-level/finance-core';
import type { JournalWriter } from './journal-repository.js';

export type JournalChangeEvent = DomainEvent;
type TransactionEventType = Extract<DomainEventType, `transaction.${string}`>;

export async function recordTransactionChange(
  journal: JournalWriter,
  transaction: Transaction,
  event: JournalChangeEvent,
): Promise<void> {
  if (
    !event.type.startsWith('transaction.') ||
    event.sourceEntityId !== transaction.id
  ) {
    throw new RangeError(
      'The outbox event must refer to the written transaction.',
    );
  }
  await journal.transactions.put(transaction);
  await journal.outbox.add(event);
}

export function createJournalChangeEvent(
  eventId: string,
  type: TransactionEventType,
  transaction: Transaction,
  occurredAt: string,
): JournalChangeEvent {
  return domainEventSchema.parse({
    eventId,
    type,
    version: 1,
    sourceEntityId: transaction.id,
    occurredAt,
    payload:
      transaction.kind === 'income' || transaction.kind === 'expense'
        ? { categoryId: transaction.categoryId }
        : {},
  });
}
