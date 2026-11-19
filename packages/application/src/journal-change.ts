import { uuidSchema } from '@money-level/contracts';
import type { Transaction } from '@money-level/finance-core';
import type { JournalWriter } from './journal-repository.js';

export interface JournalChangeEvent {
  eventId: string;
  type: string;
  version: number;
  sourceEntityId: string;
  occurredAt: string;
  payload: Readonly<Record<string, never>>;
}

export async function recordTransactionChange(
  journal: JournalWriter,
  transaction: Transaction,
  event: JournalChangeEvent,
): Promise<void> {
  if (event.sourceEntityId !== transaction.id) {
    throw new RangeError(
      'The outbox event must refer to the written transaction.',
    );
  }
  await journal.transactions.put(transaction);
  await journal.outbox.add(event);
}

export function createJournalChangeEvent(
  eventId: string,
  type: string,
  transaction: Transaction,
  occurredAt: string,
): JournalChangeEvent {
  return {
    eventId: uuidSchema.parse(eventId),
    type,
    version: 1,
    sourceEntityId: transaction.id,
    occurredAt,
    payload: {},
  };
}
