import type { Account, Category, Transaction } from '@money-level/finance-core';

export interface ReadRepository<Record> {
  get(id: string): Promise<Record | undefined>;
  list(): Promise<Record[]>;
}

export interface Repository<Record> extends ReadRepository<Record> {
  put(record: Record): Promise<void>;
}

interface JournalRecords {
  accounts: Account;
  categories: Category;
  transactions: Transaction;
}

export type JournalReader = {
  [Table in keyof JournalRecords]: ReadRepository<JournalRecords[Table]>;
};
export type JournalWriter = {
  [Table in keyof JournalRecords]: Repository<JournalRecords[Table]>;
};

export interface UnitOfWork {
  read<Result>(
    operation: (journal: JournalReader) => Promise<Result>,
  ): Promise<Result>;
  write<Result>(
    operation: (journal: JournalWriter) => Promise<Result>,
  ): Promise<Result>;
}
