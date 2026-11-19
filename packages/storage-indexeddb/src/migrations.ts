import {
  accountSchema,
  categorySchema,
  transactionSchema,
} from '@money-level/finance-core';
import type { Transaction } from 'dexie';

export const currentJournalSchemaVersion = 10;

interface AppMigration {
  version: number;
  appliedAt: string;
}

export function recordMigration(
  transaction: Transaction,
  version: number,
): Promise<void> {
  return transaction
    .table<AppMigration, number>('appMigrations')
    .add({
      version,
      appliedAt: new Date().toISOString(),
    })
    .then(() => undefined);
}

export function migrateJournal(transaction: Transaction): Promise<void> {
  // A rejected validation aborts the versionchange transaction and preserves the old database.
  return transaction
    .table('accounts')
    .toArray()
    .then((rows) => {
      rows.forEach((row) => accountSchema.parse(row));
      return transaction.table('categories').toArray();
    })
    .then((rows) => {
      rows.forEach((row) => categorySchema.parse(row));
      return transaction.table('transactions').toArray();
    })
    .then((rows) => {
      rows.forEach((row) => transactionSchema.parse(row));
      return recordMigration(transaction, 4);
    });
}

export function initializeMigrationHistory(
  transaction: Transaction,
): Promise<void> {
  return recordMigration(transaction, currentJournalSchemaVersion);
}
