import { systemClock, uuidSchema } from '@money-level/contracts';
import type { UUID } from '@money-level/contracts';
import {
  transactionPatchSchema,
  transactionSchema,
} from '@money-level/finance-core';
import type { Transaction, TransactionPatch } from '@money-level/finance-core';
import { validateJournalReferences } from './create-transaction.js';
import type { TransactionCommandContext } from './create-transaction.js';
import {
  createJournalChangeEvent,
  recordTransactionChange,
} from './journal-change.js';

export function updateTransaction(
  context: TransactionCommandContext,
  id: UUID,
  patch: TransactionPatch,
): Promise<Transaction> {
  return context.storage.write(async (journal) => {
    const previous = await journal.transactions.get(uuidSchema.parse(id));
    if (!previous || previous.deletedAt !== undefined) {
      throw new RangeError('The active journal entry does not exist.');
    }
    const { note, ...fields } = transactionPatchSchema.parse(patch);
    const changes = Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== undefined),
    );
    const updatedAt = (context.clock ?? systemClock).now().toISOString();
    const candidate = { ...previous, ...changes, updatedAt };
    if (note === null) delete candidate.note;
    else if (note !== undefined) candidate.note = note;

    const updated = transactionSchema.parse(candidate);
    await validateJournalReferences(
      journal,
      updated,
      context.baseCurrency,
      previous,
    );
    await recordTransactionChange(
      journal,
      updated,
      createJournalChangeEvent(
        context.createId(),
        'transaction.updated',
        updated,
        updatedAt,
      ),
    );
    return updated;
  });
}

export function deleteTransaction(
  context: TransactionCommandContext,
  id: UUID,
): Promise<void> {
  return context.storage.write(async (journal) => {
    const previous = await journal.transactions.get(uuidSchema.parse(id));
    if (!previous || previous.deletedAt !== undefined) return;

    const now = (context.clock ?? systemClock).now().getTime();
    // Assign a distinct deletion timestamp even when this entry changes twice in a millisecond.
    const deletedAt = new Date(
      Math.max(now, Date.parse(previous.updatedAt) + 1),
    ).toISOString();
    const deleted = { ...previous, deletedAt, updatedAt: deletedAt };
    await recordTransactionChange(
      journal,
      deleted,
      createJournalChangeEvent(
        context.createId(),
        'transaction.deleted',
        deleted,
        deletedAt,
      ),
    );
  });
}
