import {
  currencyCodeSchema,
  isoDateSchema,
  isoDateTimeSchema,
  minorUnitsSchema,
  uuidSchema,
} from '@money-level/contracts';
import type {
  ISODate,
  ISODateTime,
  MinorUnits,
  UUID,
} from '@money-level/contracts';
import { z } from 'zod';
import type { Account } from './account.js';

export const journalEntryFields = {
  id: uuidSchema,
  currencyCode: currencyCodeSchema,
  accountId: uuidSchema,
  transactionDate: isoDateSchema,
  note: z.string().max(500).optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  deletedAt: isoDateTimeSchema.optional(),
};

export const openingEntrySchema = z.strictObject({
  ...journalEntryFields,
  kind: z.literal('opening'),
  amountMinor: minorUnitsSchema,
});

export type OpeningEntry = z.infer<typeof openingEntrySchema>;

export function createOpeningEntry(
  account: Account,
  input: {
    id: UUID;
    amountMinor: MinorUnits;
    transactionDate: ISODate;
    createdAt: ISODateTime;
  },
): OpeningEntry {
  return openingEntrySchema.parse({
    ...input,
    kind: 'opening',
    accountId: account.id,
    currencyCode: account.currencyCode,
    updatedAt: input.createdAt,
  });
}
