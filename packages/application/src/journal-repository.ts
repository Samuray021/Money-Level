import type { Budget, BudgetNotice } from '@money-level/budgets';
import type { ProfileSettings } from '@money-level/contracts';
import type { Account, Category, Transaction } from '@money-level/finance-core';
import type { Goal, GoalAllocation } from '@money-level/goals';
import type { JournalChangeEvent } from './journal-change.js';

export interface ReadRepository<Record> {
  get(id: string): Promise<Record | undefined>;
  list(): Promise<Record[]>;
}

export interface Repository<Record> extends ReadRepository<Record> {
  put(record: Record): Promise<void>;
}

interface JournalRecords {
  settings: ProfileSettings;
  budgets: Budget;
  budgetNotices: BudgetNotice;
  goals: Goal;
  goalAllocations: GoalAllocation;
  accounts: Account;
  categories: Category;
  transactions: Transaction;
}

export interface CommandReceipt {
  key: string;
  transactionId: string;
}

interface CommandReceiptReader {
  get(key: string): Promise<CommandReceipt | undefined>;
}

interface OutboxReader {
  list(): Promise<JournalChangeEvent[]>;
}

export type JournalReader = {
  [Table in keyof JournalRecords]: ReadRepository<JournalRecords[Table]>;
} & { outbox: OutboxReader; commands: CommandReceiptReader };

export type JournalWriter = {
  [Table in keyof JournalRecords]: Repository<JournalRecords[Table]>;
} & {
  outbox: OutboxReader & { add(event: JournalChangeEvent): Promise<void> };
  commands: CommandReceiptReader & {
    add(receipt: CommandReceipt): Promise<void>;
  };
};

export interface UnitOfWork {
  read<Result>(
    operation: (journal: JournalReader) => Promise<Result>,
  ): Promise<Result>;
  write<Result>(
    operation: (journal: JournalWriter) => Promise<Result>,
  ): Promise<Result>;
}
