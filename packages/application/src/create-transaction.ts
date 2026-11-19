import { systemClock } from '@money-level/contracts';
import type {
  Clock,
  CurrencyCode,
  ISODate,
  MinorUnits,
  UUID,
} from '@money-level/contracts';
import {
  assertTransactionReferences,
  transactionSchema,
} from '@money-level/finance-core';
import type { Transaction } from '@money-level/finance-core';
import {
  createJournalChangeEvent,
  recordTransactionChange,
} from './journal-change.js';
import type { JournalReader, UnitOfWork } from './journal-repository.js';

export interface JournalCommandContext {
  storage: UnitOfWork;
  createId: () => UUID;
  clock?: Clock;
}

export interface TransactionCommandContext extends JournalCommandContext {
  baseCurrency: CurrencyCode;
}

export interface NewTransactionInput {
  idempotencyKey: string;
  accountId: UUID;
  amountMinor: MinorUnits;
  transactionDate: ISODate;
  note?: string;
}

export interface CategorizedTransactionInput extends NewTransactionInput {
  categoryId: UUID;
}

export interface TransferInput extends NewTransactionInput {
  toAccountId: UUID;
}

type CreateTransactionInput =
  | (CategorizedTransactionInput & { kind: 'income' | 'expense' })
  | (TransferInput & { kind: 'transfer' });

export async function validateJournalReferences(
  journal: JournalReader,
  transaction: Transaction,
  baseCurrency: CurrencyCode,
  previous?: Transaction,
): Promise<void> {
  const source = await journal.accounts.get(transaction.accountId);
  const destination =
    transaction.kind === 'transfer'
      ? await journal.accounts.get(transaction.toAccountId)
      : undefined;
  const category =
    transaction.kind === 'income' || transaction.kind === 'expense'
      ? await journal.categories.get(transaction.categoryId)
      : undefined;

  assertTransactionReferences(transaction, {
    baseCurrency,
    accounts: [source, destination].filter((account) => account !== undefined),
    categories: category ? [category] : [],
  });
  const previousDestination =
    previous?.kind === 'transfer' ? previous.toAccountId : undefined;
  const previousCategory =
    previous?.kind === 'income' || previous?.kind === 'expense'
      ? previous.categoryId
      : undefined;
  if (
    (source?.archived && source.id !== previous?.accountId) ||
    (destination?.archived && destination.id !== previousDestination) ||
    (category?.archived && category.id !== previousCategory)
  ) {
    throw new RangeError(
      'Archived accounts and categories cannot be used in new links.',
    );
  }
}

async function createTransaction(
  context: TransactionCommandContext,
  input: CreateTransactionInput,
): Promise<Transaction> {
  const { idempotencyKey, ...fields } = input;
  const key = idempotencyKey.trim();
  if (!key) throw new RangeError('An idempotency key is required.');

  return context.storage.write(async (journal) => {
    const receipt = await journal.commands.get(key);
    if (receipt) {
      const existing = await journal.transactions.get(receipt.transactionId);
      if (existing?.kind !== fields.kind) {
        throw new RangeError(
          'Idempotency key already belongs to a different operation.',
        );
      }
      return existing;
    }

    const occurredAt = (context.clock ?? systemClock).now().toISOString();
    const transaction = transactionSchema.parse({
      ...fields,
      id: context.createId(),
      currencyCode: context.baseCurrency,
      createdAt: occurredAt,
      updatedAt: occurredAt,
    });
    if (await journal.transactions.get(transaction.id)) {
      throw new RangeError(
        'A journal entry already uses the generated identifier.',
      );
    }
    await validateJournalReferences(journal, transaction, context.baseCurrency);

    await recordTransactionChange(
      journal,
      transaction,
      createJournalChangeEvent(
        context.createId(),
        `transaction.${fields.kind}.created`,
        transaction,
        occurredAt,
      ),
    );
    await journal.commands.add({ key, transactionId: transaction.id });
    return transaction;
  });
}

export function addIncome(
  context: TransactionCommandContext,
  input: CategorizedTransactionInput,
): Promise<Transaction> {
  return createTransaction(context, { ...input, kind: 'income' });
}

export function addExpense(
  context: TransactionCommandContext,
  input: CategorizedTransactionInput,
): Promise<Transaction> {
  return createTransaction(context, { ...input, kind: 'expense' });
}

export function transfer(
  context: TransactionCommandContext,
  input: TransferInput,
): Promise<Transaction> {
  return createTransaction(context, { ...input, kind: 'transfer' });
}
