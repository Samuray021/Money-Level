import { z } from 'zod';
import { currencyCodeSchema, uuidSchema } from './primitives.js';

const timeZoneSchema = z.string().refine((value) => {
  if (!/^[a-z][a-z0-9_+-]*(?:\/[a-z0-9_+-]+)*$/i.test(value)) return false;
  try {
    new Intl.DateTimeFormat('ru-RU', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}, 'Use a supported IANA time zone.');

const humorFrequencySchema = z.enum(['off', 'rare', 'usual']);
export type HumorFrequency = z.infer<typeof humorFrequencySchema>;

export const profileSettingsSchema = z.strictObject({
  id: z.literal('profile'),
  locale: z.literal('ru-RU'),
  timeZone: timeZoneSchema,
  baseCurrency: currencyCodeSchema,
  firstAccountId: uuidSchema,
  onboardingCompleted: z.boolean(),
  budgetNotificationsEnabled: z.boolean().default(true),
  balanceHidden: z.boolean().default(false),
  starterCategoriesReady: z.boolean().default(false),
  humorMode: z.enum(['off', 'neutral', 'roast', 'chaos']).default('roast'),
  humorFrequency: humorFrequencySchema.default('usual'),
  adultHumorConfirmed: z.boolean().default(false),
  profanityEnabled: z.boolean().default(false),
  companionEnabled: z.boolean().default(true),
  quietMode: z.boolean().default(false),
  motionEnabled: z.boolean().default(true),
  soundsEnabled: z.boolean().default(false),
});

export type ProfileSettings = z.infer<typeof profileSettingsSchema>;
