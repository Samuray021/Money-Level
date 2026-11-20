import { profileSettingsSchema } from '@money-level/contracts';
import type { ProfileSettings } from '@money-level/contracts';
import type { UnitOfWork } from './journal-repository.js';

export type HumorSettings = Pick<
  ProfileSettings,
  | 'humorMode'
  | 'humorFrequency'
  | 'adultHumorConfirmed'
  | 'profanityEnabled'
  | 'companionEnabled'
  | 'quietMode'
  | 'motionEnabled'
  | 'soundsEnabled'
>;

export function resolveHumorPolicy(
  settings?: HumorSettings & Pick<ProfileSettings, 'onboardingCompleted'>,
) {
  const mode =
    settings?.onboardingCompleted && settings.humorFrequency !== 'off'
      ? settings.humorMode
      : 'off';
  const playful = mode === 'roast' || mode === 'chaos';
  const companion = Boolean(
    settings?.onboardingCompleted && settings.companionEnabled,
  );
  const reactions = companion && mode !== 'off';
  const quiet = settings?.quietMode ?? false;
  return {
    mode,
    playful,
    profanity:
      playful &&
      Boolean(settings?.adultHumorConfirmed && settings.profanityEnabled),
    companion,
    reactions,
    popups: reactions && !quiet,
    playSound: reactions && !quiet && Boolean(settings?.soundsEnabled),
    motion: settings?.motionEnabled ?? true,
  };
}

export function saveHumorSettings(
  storage: UnitOfWork,
  input: HumorSettings,
): Promise<ProfileSettings> {
  return storage.write(async ({ settings }) => {
    const profile = await settings.get('profile');
    if (!profile?.onboardingCompleted)
      throw new RangeError('The profile setup is incomplete.');
    const updated = profileSettingsSchema.parse({
      ...profile,
      humorMode: input.humorMode,
      humorFrequency: input.humorFrequency,
      adultHumorConfirmed: input.adultHumorConfirmed,
      profanityEnabled: input.adultHumorConfirmed && input.profanityEnabled,
      companionEnabled: input.companionEnabled,
      quietMode: input.quietMode,
      motionEnabled: input.motionEnabled,
      soundsEnabled: input.soundsEnabled,
    });
    await settings.put(updated);
    return updated;
  });
}
