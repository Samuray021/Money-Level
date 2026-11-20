import { systemClock } from '@money-level/contracts';
import type { Clock, RandomSource } from '@money-level/contracts';
import {
  defaultMemePack,
  evaluateMeme,
  memePackSchema,
} from '@money-level/meme-engine';
import type { MemeReaction } from '@money-level/meme-engine';
import { resolveHumorPolicy } from './humor-settings.js';
import type { UnitOfWork } from './journal-repository.js';
import { consumeOutbox } from './outbox.js';

export async function runMemeReactions(
  storage: UnitOfWork,
  session: { id: string; startedAt: number },
  random: RandomSource,
  clock: Clock = systemClock,
  packInput?: unknown,
): Promise<MemeReaction[]> {
  const parsed =
    packInput === undefined ? undefined : memePackSchema.safeParse(packInput);
  if (parsed && !parsed.success) return [];
  const pack = parsed?.data ?? defaultMemePack;
  const candidates = await consumeOutbox(storage, {
    consumer: 'meme-engine',
    clock,
    filter: (event) => Date.parse(event.occurredAt) >= session.startedAt,
    async handle(event, journal) {
      const profile = await journal.settings.get('profile');
      const policy = resolveHumorPolicy(profile);
      if (!profile || !policy.reactions) return undefined;
      const reaction = evaluateMeme(pack, {
        event,
        mode: policy.mode,
        frequency: profile.humorFrequency,
        profanity: policy.profanity,
        locale: profile.locale,
        sessionId: session.id,
        random,
        clock,
        history: await journal.memeShown.list(),
      });
      if (reaction)
        await journal.memeShown.put({
          id: event.eventId,
          packId: reaction.packId,
          ruleId: reaction.ruleId,
          sessionId: session.id,
          rarity: reaction.rarity,
          shownAt: clock.now().toISOString(),
        });
      return reaction;
    },
  });
  return candidates.filter((reaction) => reaction !== undefined);
}
