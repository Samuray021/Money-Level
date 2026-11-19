import { budgetNoticeSchema, budgetSchema } from '@money-level/budgets';
import {
  domainEventSchema,
  isoDateTimeSchema,
  profileSettingsSchema,
  uuidSchema,
} from '@money-level/contracts';
import {
  accountSchema,
  categorySchema,
  transactionSchema,
} from '@money-level/finance-core';
import { goalAllocationSchema, goalSchema } from '@money-level/goals';
import { z } from 'zod';

export const backupSchemaVersion = 1;

const commandReceiptSchema = z.strictObject({
  key: z.string().trim().min(1),
  transactionId: uuidSchema,
});

export const backupDataSchema = z.strictObject({
  settings: profileSettingsSchema.nullable(),
  accounts: z.array(accountSchema),
  categories: z.array(categorySchema),
  transactions: z.array(transactionSchema),
  budgets: z.array(budgetSchema),
  budgetNotices: z.array(budgetNoticeSchema),
  goals: z.array(goalSchema),
  goalAllocations: z.array(goalAllocationSchema),
  outbox: z.array(domainEventSchema),
  commandReceipts: z.array(commandReceiptSchema),
});

export const backupFileSchema = z.strictObject({
  schemaVersion: z.literal(backupSchemaVersion),
  createdAt: isoDateTimeSchema,
  checksum: z.string().regex(/^[a-f0-9]{64}$/),
  data: backupDataSchema,
});

export type BackupData = z.infer<typeof backupDataSchema>;
export type BackupFile = z.infer<typeof backupFileSchema>;
export type BackupChecksum = (serialized: string) => Promise<string>;

export const recoverySnapshotSchema = z.strictObject({
  id: uuidSchema,
  createdAt: isoDateTimeSchema,
  data: backupDataSchema,
});

export type RecoverySnapshot = z.infer<typeof recoverySnapshotSchema>;
