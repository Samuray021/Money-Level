import type {
  JournalReader,
  JournalWriter,
  Repository,
  UnitOfWork,
} from '@money-level/application';
import {
  accountSchema,
  categorySchema,
  transactionSchema,
} from '@money-level/finance-core';
import { Dexie } from 'dexie';
import type { DexieOptions, Table } from 'dexie';

function repository<Record>(
  table: Table<Record, string>,
  schema: { parse(value: unknown): Record },
): Repository<Record> {
  return {
    async get(id) {
      const record = await table.get(id);
      return record === undefined ? undefined : schema.parse(record);
    },
    async list() {
      return (await table.toArray()).map((record) => schema.parse(record));
    },
    async put(record) {
      await table.put(schema.parse(record));
    },
  };
}

export class IndexedDbJournal implements UnitOfWork {
  private readonly database: Dexie;
  private readonly repositories: JournalWriter;

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
    this.repositories = {
      accounts: repository(this.database.table('accounts'), accountSchema),
      categories: repository(this.database.table('categories'), categorySchema),
      transactions: repository(
        this.database.table('transactions'),
        transactionSchema,
      ),
    };
  }

  read<Result>(
    operation: (journal: JournalReader) => Promise<Result>,
  ): Promise<Result> {
    return this.database.transaction('r', this.database.tables, () =>
      operation(this.repositories),
    );
  }

  write<Result>(
    operation: (journal: JournalWriter) => Promise<Result>,
  ): Promise<Result> {
    return this.database.transaction('rw', this.database.tables, () =>
      operation(this.repositories),
    );
  }

  close(): void {
    this.database.close();
  }
}
