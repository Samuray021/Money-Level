import { profileSettingsSchema } from '@money-level/contracts';
import type { ProfileSettings } from '@money-level/contracts';
import type { UnitOfWork } from './journal-repository.js';

export type HumorSettings = Pick<
  ProfileSettings,
  | 'humorMode'
  | 'humorFrequency'
  | 'profanityEnabled'
  | 'companionEnabled'
  | 'quietMode'
  | 'motionEnabled'
  | 'soundsEnabled'
>;

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
      profanityEnabled: input.profanityEnabled,
      companionEnabled: input.companionEnabled,
      quietMode: input.quietMode,
      motionEnabled: input.motionEnabled,
      soundsEnabled: input.soundsEnabled,
    });
    await settings.put(updated);
    return updated;
  });
}
