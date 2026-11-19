import { z } from 'zod';

export const uuidSchema = z.uuidv4().transform((uuid) => uuid.toLowerCase());
export const isoDateSchema = z.iso.date();
export const isoDateTimeSchema = z.iso.datetime();
export const currencyCodeSchema = z.enum(Intl.supportedValuesOf('currency'));
export const minorUnitsSchema = z.string().regex(/^-?\d+$/);

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
