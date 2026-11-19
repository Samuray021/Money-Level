import { z } from 'zod';
import { currencyCodeSchema, uuidSchema } from './primitives.js';

const timeZoneSchema = z.string().refine((value) => {
  try {
    new Intl.DateTimeFormat('ru-RU', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}, 'Use a supported IANA time zone.');

export const profileSettingsSchema = z.strictObject({
  id: z.literal('profile'),
  locale: z.literal('ru-RU'),
  timeZone: timeZoneSchema,
  baseCurrency: currencyCodeSchema,
  firstAccountId: uuidSchema,
  onboardingCompleted: z.boolean(),
});

export type ProfileSettings = z.infer<typeof profileSettingsSchema>;
