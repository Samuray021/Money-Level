import { recoverySnapshotSchema } from '@money-level/application';
import { budgetNoticeSchema, budgetSchema } from '@money-level/budgets';
import type {
  CommandReceipt,
  JournalChangeEvent,
  JournalReader,
  JournalWriter,
  Repository,
  UnitOfWork,
} from '@money-level/application';
import {
  domainEventSchema,
  profileSettingsSchema,
} from '@money-level/contracts';
import {
  accountSchema,
  categorySchema,
  transactionSchema,
} from '@money-level/finance-core';
import { goalAllocationSchema, goalSchema } from '@money-level/goals';
import { Dexie } from 'dexie';
import type { DexieOptions, Table, Transaction } from 'dexie';
import {
  initializeMigrationHistory,
  migrateJournal,
  recordMigration,
} from './migrations.js';

function repository<Record>(
  table: Table<Record, string>,
  schema: { parse(value: unknown): Record },
): Repository<Record> {
  return {
    get: (id) =>
      table
        .get(id)
        .then((record) =>
          record === undefined ? undefined : schema.parse(record),
        ),
    list: () =>
      table
        .toArray()
        .then((records) => records.map((record) => schema.parse(record))),
    put: (record) => table.put(schema.parse(record)).then(() => undefined),
    putMany: (records) =>
      table
        .bulkPut(records.map((record) => schema.parse(record)))
        .then(() => undefined),
    clear: () => table.clear(),
  };
}

export class IndexedDbJournal implements UnitOfWork {
  private readonly database: Dexie;

  constructor(
    name = 'money-level',
    dependencies?: Pick<DexieOptions, 'indexedDB' | 'IDBKeyRange'>,
  ) {
    this.database = new Dexie(name, dependencies);
    this.database.version(1).stores({
      accounts: 'id',
      categories: 'id, type',
      transactions: 'id, transactionDate, accountId, toAccountId, categoryId',
    });
    this.database.version(2).stores({
      outbox: 'eventId, occurredAt',
    });
    this.database.version(3).stores({
      commandReceipts: 'key',
    });
    this.database
      .version(4)
      .stores({
        appMigrations: 'version',
      })
      .upgrade(migrateJournal);
    this.database
      .version(5)
      .stores({ settings: 'id' })
      .upgrade((transaction) => recordMigration(transaction, 5));
    this.database
      .version(6)
      .stores({ goals: 'id, status', goalAllocations: 'id, goalId' })
      .upgrade((transaction) => recordMigration(transaction, 6));
    this.database
      .version(7)
      .stores({
        budgets: 'id, categoryId',
        budgetNotices: 'id, [budgetId+monthStart]',
      })
      .upgrade((transaction) => recordMigration(transaction, 7));
    this.database
      .version(8)
      .stores({ recoverySnapshots: 'id, createdAt' })
      .upgrade((transaction) => recordMigration(transaction, 8));
    this.database.on('populate', initializeMigrationHistory);
  }

  private repositories(transaction: Transaction): JournalWriter {
    const outbox = transaction.table<JournalChangeEvent, string>('outbox');
    const receipts = transaction.table<CommandReceipt, string>(
      'commandReceipts',
    );

    return {
      commands: {
        clear: () => receipts.clear(),
        list: () => receipts.toArray(),
        get: (key) => receipts.get(key),
        add: (receipt) => receipts.add(receipt).then(() => undefined),
      },
      outbox: {
        clear: () => outbox.clear(),
        list: () =>
          outbox
            .toArray()
            .then((events) =>
              events.map((event) => domainEventSchema.parse(event)),
            ),
        add: (event) =>
          outbox.add(domainEventSchema.parse(event)).then(() => undefined),
      },
      recoverySnapshots: repository(
        transaction.table('recoverySnapshots'),
        recoverySnapshotSchema,
      ),
      settings: repository(
        transaction.table('settings'),
        profileSettingsSchema,
      ),
      budgets: repository(transaction.table('budgets'), budgetSchema),
      budgetNotices: repository(
        transaction.table('budgetNotices'),
        budgetNoticeSchema,
      ),
      goals: repository(transaction.table('goals'), goalSchema),
      goalAllocations: repository(
        transaction.table('goalAllocations'),
        goalAllocationSchema,
      ),
      accounts: repository(transaction.table('accounts'), accountSchema),
      categories: repository(transaction.table('categories'), categorySchema),
      transactions: repository(
        transaction.table('transactions'),
        transactionSchema,
      ),
    };
  }

  read<Result>(
    operation: (journal: JournalReader) => Promise<Result>,
  ): Promise<Result> {
    return this.database.transaction('r', this.database.tables, (transaction) =>
      operation(this.repositories(transaction)),
    );
  }

  write<Result>(
    operation: (journal: JournalWriter) => Promise<Result>,
  ): Promise<Result> {
    return this.database.transaction(
      'rw',
      this.database.tables,
      (transaction) => operation(this.repositories(transaction)),
    );
  }

  async schemaVersion(): Promise<number> {
    if (!this.database.isOpen()) await this.database.open();
    return this.database.verno;
  }

  close(): void {
    this.database.close();
  }
}

export { currentJournalSchemaVersion } from './migrations.js';

export { liveQuery as observeJournal } from 'dexie';

export { sha256Checksum } from './backup-checksum.js';
