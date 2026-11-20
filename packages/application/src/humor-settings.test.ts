import { expect, test } from 'vitest';
import { resolveHumorPolicy } from './humor-settings.js';

test('all persisted humor settings combinations share the same report and reaction policy', () => {
  const switches = [false, true];
  for (const humorMode of ['off', 'neutral', 'roast', 'chaos'] as const) {
    for (const humorFrequency of ['off', 'rare', 'usual'] as const) {
      for (const adultHumorConfirmed of switches)
        for (const profanityEnabled of switches)
          for (const companionEnabled of switches)
            for (const quietMode of switches)
              for (const motionEnabled of switches)
                for (const soundsEnabled of switches) {
                  const profile = {
                    onboardingCompleted: true,
                    humorMode,
                    humorFrequency,
                    adultHumorConfirmed,
                    profanityEnabled,
                    companionEnabled,
                    quietMode,
                    motionEnabled,
                    soundsEnabled,
                  };
                  const result = resolveHumorPolicy(profile);
                  const enabled =
                    humorMode !== 'off' && humorFrequency !== 'off';
                  const playful =
                    enabled && (humorMode === 'roast' || humorMode === 'chaos');
                  expect(result).toEqual({
                    mode: enabled ? humorMode : 'off',
                    playful,
                    profanity:
                      playful && adultHumorConfirmed && profanityEnabled,
                    companion: companionEnabled,
                    reactions: enabled && companionEnabled,
                    popups: enabled && companionEnabled && !quietMode,
                    playSound:
                      enabled &&
                      companionEnabled &&
                      !quietMode &&
                      soundsEnabled,
                    motion: motionEnabled,
                  });
                }
    }
  }
  expect(resolveHumorPolicy()).toMatchObject({
    mode: 'off',
    reactions: false,
    playSound: false,
  });
});
