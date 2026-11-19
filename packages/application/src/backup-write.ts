import { systemClock, uuidSchema } from '@money-level/contracts';
import { readBackupData } from './backup-export.js';
import type { BackupChecksum, BackupData } from './backup-format.js';
import { validateBackupJson } from './backup-import.js';
import type { JournalCommandContext } from './create-transaction.js';
import type { JournalWriter } from './journal-repository.js';

export async function clearBackupData(journal: JournalWriter): Promise<void> {
  await journal.settings.clear();
  await journal.accounts.clear();
  await journal.categories.clear();
  await journal.transactions.clear();
  await journal.budgets.clear();
  await journal.budgetNotices.clear();
  await journal.goals.clear();
  await journal.goalAllocations.clear();
  await journal.outbox.clear();
  await journal.eventReceipts.clear();
  await journal.memeShown.clear();
  await journal.achievements.clear();
  await journal.commands.clear();
}

export async function writeBackupData(
  journal: JournalWriter,
  data: BackupData,
): Promise<void> {
  if (data.settings) await journal.settings.put(data.settings);
  await journal.accounts.putMany(data.accounts);
  await journal.categories.putMany(data.categories);
  await journal.transactions.putMany(data.transactions);
  await journal.budgets.putMany(data.budgets);
  await journal.budgetNotices.putMany(data.budgetNotices);
  await journal.goals.putMany(data.goals);
  await journal.goalAllocations.putMany(data.goalAllocations);
  await journal.eventReceipts.putMany(data.eventReceipts);
  await journal.memeShown.putMany(data.memeShown);
  await journal.achievements.putMany(data.achievements);
  for (const event of data.outbox) await journal.outbox.add(event);
  for (const receipt of data.commandReceipts)
    await journal.commands.add(receipt);
}

export async function replaceBackup(
  context: JournalCommandContext,
  text: string,
  checksum: BackupChecksum,
  confirmed: boolean,
): Promise<{ snapshotId: string }> {
  if (!confirmed)
    throw new RangeError(
      'Replacing the journal requires explicit confirmation.',
    );
  const { data } = await validateBackupJson(text, checksum);
  return context.storage.write(async (journal) => {
    const snapshotId = uuidSchema.parse(context.createId());
    if (await journal.recoverySnapshots.get(snapshotId))
      throw new RangeError('Snapshot identifier is already in use.');
    await journal.recoverySnapshots.put({
      id: snapshotId,
      createdAt: (context.clock ?? systemClock).now().toISOString(),
      data: await readBackupData(journal),
    });
    await clearBackupData(journal);
    await writeBackupData(journal, data);
    return { snapshotId };
  });
}
