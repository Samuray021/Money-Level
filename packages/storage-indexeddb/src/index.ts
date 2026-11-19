import type {
  CommandReceipt,
  JournalChangeEvent,
  JournalReader,
  JournalWriter,
  Repository,
  UnitOfWork,
} from '@money-level/application';
import { profileSettingsSchema } from '@money-level/contracts';
import {
  accountSchema,
  categorySchema,
  transactionSchema,
} from '@money-level/finance-core';
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
    this.database.on('populate', initializeMigrationHistory);
  }

  private repositories(transaction: Transaction): JournalWriter {
    const outbox = transaction.table<JournalChangeEvent, string>('outbox');
    const receipts = transaction.table<CommandReceipt, string>(
      'commandReceipts',
    );

    return {
      commands: {
        get: (key) => receipts.get(key),
        add: (receipt) => receipts.add(receipt).then(() => undefined),
      },
      outbox: {
        list: () => outbox.toArray(),
        async add(event) {
          const { eventId, type, version, sourceEntityId, occurredAt } = event;
          await outbox.add({
            eventId,
            type,
            version,
            sourceEntityId,
            occurredAt,
            payload: {},
          });
        },
      },
      settings: repository(
        transaction.table('settings'),
        profileSettingsSchema,
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
