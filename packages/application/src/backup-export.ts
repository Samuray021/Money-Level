import { systemClock } from '@money-level/contracts';
import type { Clock } from '@money-level/contracts';
import {
  backupDataSchema,
  backupFileSchema,
  backupSchemaVersion,
} from './backup-format.js';
import type {
  BackupChecksum,
  BackupData,
  BackupFile,
} from './backup-format.js';
import type { JournalReader, UnitOfWork } from './journal-repository.js';

export async function readBackupData(
  journal: JournalReader,
): Promise<BackupData> {
  return backupDataSchema.parse({
    settings: (await journal.settings.get('profile')) ?? null,
    accounts: await journal.accounts.list(),
    categories: await journal.categories.list(),
    transactions: await journal.transactions.list(),
    budgets: await journal.budgets.list(),
    budgetNotices: await journal.budgetNotices.list(),
    goals: await journal.goals.list(),
    goalAllocations: await journal.goalAllocations.list(),
    outbox: await journal.outbox.list(),
    eventReceipts: await journal.eventReceipts.list(),
    commandReceipts: await journal.commands.list(),
  });
}

export function checksumPayload(
  schemaVersion: number,
  createdAt: string,
  data: unknown,
): string {
  return JSON.stringify({ schemaVersion, createdAt, data });
}

export async function exportBackup(
  storage: UnitOfWork,
  checksum: BackupChecksum,
  clock: Clock = systemClock,
): Promise<BackupFile> {
  const createdAt = clock.now().toISOString();
  const data = await storage.read(readBackupData);
  const digest = await checksum(
    checksumPayload(backupSchemaVersion, createdAt, data),
  );
  return backupFileSchema.parse({
    schemaVersion: backupSchemaVersion,
    createdAt,
    data,
    checksum: digest,
  });
}
