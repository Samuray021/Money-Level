import {
  isoDateSchema,
  minorUnitsSchema,
  uuidSchema,
} from '@money-level/contracts';
import { z } from 'zod';
import { journalEntryFields, openingEntrySchema } from './opening-entry.js';

const positiveMinorUnits = minorUnitsSchema.regex(/^0*[1-9]\d*$/);

export const transactionSchema = z.discriminatedUnion('kind', [
  openingEntrySchema,
  z.strictObject({
    ...journalEntryFields,
    kind: z.literal('income'),
    amountMinor: positiveMinorUnits,
    categoryId: uuidSchema,
  }),
  z.strictObject({
    ...journalEntryFields,
    kind: z.literal('expense'),
    amountMinor: positiveMinorUnits,
    categoryId: uuidSchema,
  }),
  z
    .strictObject({
      ...journalEntryFields,
      kind: z.literal('transfer'),
      amountMinor: positiveMinorUnits,
      toAccountId: uuidSchema,
    })
    .refine((entry) => entry.accountId !== entry.toAccountId, {
      path: ['toAccountId'],
      message: 'Transfer source and destination must be different.',
    }),
  z.strictObject({
    ...journalEntryFields,
    kind: z.literal('adjustment'),
    amountMinor: minorUnitsSchema,
  }),
]);

export type Transaction = z.infer<typeof transactionSchema>;

export const transactionPatchSchema = z.strictObject({
  accountId: uuidSchema.optional(),
  categoryId: uuidSchema.optional(),
  toAccountId: uuidSchema.optional(),
  amountMinor: minorUnitsSchema.optional(),
  transactionDate: isoDateSchema.optional(),
  note: z.string().max(500).nullable().optional(),
});

export type TransactionPatch = z.infer<typeof transactionPatchSchema>;
