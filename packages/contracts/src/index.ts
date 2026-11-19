import { z } from 'zod';

import {
  currencyCodeSchema,
  isoDateSchema,
  isoDateTimeSchema,
  minorUnitsSchema,
  uuidSchema,
} from './primitives.js';

export { positiveMinorUnitsSchema } from './primitives.js';

export {
  currencyCodeSchema,
  isoDateSchema,
  isoDateTimeSchema,
  minorUnitsSchema,
  uuidSchema,
};

export const accountKindSchema = z.enum(['cash', 'card', 'savings', 'other']);
export const categoryTypeSchema = z.enum(['income', 'expense']);
export const transactionKindSchema = z.enum([
  'opening',
  'income',
  'expense',
  'transfer',
  'adjustment',
]);

export type UUID = z.infer<typeof uuidSchema>;
export type ISODate = z.infer<typeof isoDateSchema>;
export type ISODateTime = z.infer<typeof isoDateTimeSchema>;
export type CurrencyCode = z.infer<typeof currencyCodeSchema>;
export type MinorUnits = z.infer<typeof minorUnitsSchema>;
export type AccountKind = z.infer<typeof accountKindSchema>;
export type CategoryType = z.infer<typeof categoryTypeSchema>;
export type TransactionKind = z.infer<typeof transactionKindSchema>;

export { createSeededRandom, systemClock } from './runtime.js';
export type { Clock, RandomSource } from './runtime.js';

export { profileSettingsSchema } from './profile-settings.js';
export type { HumorFrequency, ProfileSettings } from './profile-settings.js';

export { localTransactionDate } from './date.js';

export { domainEventSchema, domainEventTypeSchema } from './domain-event.js';
export type { DomainEvent, DomainEventType } from './domain-event.js';

export { eventReceiptSchema } from './domain-event.js';
export type { EventReceipt } from './domain-event.js';
