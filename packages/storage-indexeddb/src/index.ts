import { achievementSchema } from '@money-level/gamification';
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
  eventReceiptSchema,
  memeShownSchema,
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
import { verifyJournalVersion } from './journal-version.js';

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
  private readonly factory: Pick<IDBFactory, 'open'> | undefined;
  private versionCheck: Promise<void> | undefined;

  constructor(
    name = 'money-level',
    dependencies?: Pick<DexieOptions, 'IDBKeyRange'> & {
      indexedDB?: Pick<IDBFactory, 'open'>;
    },
  ) {
    this.database = new Dexie(name, dependencies);
    this.factory = dependencies?.indexedDB ?? globalThis.indexedDB;
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
    this.database
      .version(9)
      .stores({ eventReceipts: 'id, [consumer+eventId]' })
      .upgrade((transaction) => recordMigration(transaction, 9));
    this.database
      .version(10)
      .stores({ memeShown: 'id, shownAt' })
      .upgrade((transaction) => recordMigration(transaction, 10));
    this.database
      .version(11)
      .stores({ achievements: 'id, &[kind+sourceKey]' })
      .upgrade((transaction) => recordMigration(transaction, 11));
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
        get: (id) =>
          outbox
            .get(id)
            .then((event) =>
              event === undefined ? undefined : domainEventSchema.parse(event),
            ),
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
      eventReceipts: repository(
        transaction.table('eventReceipts'),
        eventReceiptSchema,
      ),
      memeShown: repository(transaction.table('memeShown'), memeShownSchema),
      achievements: repository(
        transaction.table('achievements'),
        achievementSchema,
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

  private verifyVersion() {
    this.versionCheck ??= verifyJournalVersion(
      this.database.name,
      this.factory,
    );
    return this.versionCheck;
  }

  async read<Result>(
    operation: (journal: JournalReader) => Promise<Result>,
  ): Promise<Result> {
    await this.verifyVersion();
    return this.database.transaction('r', this.database.tables, (transaction) =>
      operation(this.repositories(transaction)),
    );
  }

  async write<Result>(
    operation: (journal: JournalWriter) => Promise<Result>,
  ): Promise<Result> {
    await this.verifyVersion();
    return this.database.transaction(
      'rw',
      this.database.tables,
      (transaction) => operation(this.repositories(transaction)),
    );
  }

  async schemaVersion(): Promise<number> {
    await this.verifyVersion();
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
