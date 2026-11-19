import { z } from 'zod';

export const uuidSchema = z.uuidv4().transform((uuid) => uuid.toLowerCase());
export const isoDateSchema = z.iso.date();
export const isoDateTimeSchema = z.iso.datetime();
export const currencyCodeSchema = z.enum(Intl.supportedValuesOf('currency'));
export const minorUnitsSchema = z.string().regex(/^-?\d+$/);
