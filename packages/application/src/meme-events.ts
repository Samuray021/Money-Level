import { systemClock } from '@money-level/contracts';
import type { RandomSource } from '@money-level/contracts';
import {
  defaultMemePack,
  evaluateMeme,
  memePackSchema,
} from '@money-level/meme-engine';
import type { MemeReaction } from '@money-level/meme-engine';
import type { JournalCommandContext } from './create-transaction.js';
import { resolveHumorPolicy } from './humor-settings.js';
import { consumeOutbox } from './outbox.js';

export type DeliveredReaction = MemeReaction & { ambient?: true };

export async function runMemeReactions(
  context: JournalCommandContext,
  session: { id: string; startedAt: number },
  random: RandomSource,
  packInput?: unknown,
): Promise<DeliveredReaction[]> {
  const clock = context.clock ?? systemClock;
  const parsed =
    packInput === undefined ? undefined : memePackSchema.safeParse(packInput);
  if (parsed && !parsed.success) return [];
  const pack = parsed?.data ?? defaultMemePack;
  const candidates = await consumeOutbox<DeliveredReaction | undefined>(
    context.storage,
    {
      consumer: 'meme-engine',
      clock,
      filter: (event) => {
        if (Date.parse(event.occurredAt) < session.startedAt) return false;
        if (
          event.type === 'app.session.started' ||
          event.type.startsWith('analytics.')
        )
          return event.sourceEntityId === session.id;
        return true;
      },
      async handle(event, journal) {
        // A rare scene already rendered the effect. Its receipt ends the chain.
        if (event.type === 'easter_egg.triggered') return undefined;
        const ambient = event.type === 'app.session.started';
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
          history: ambient ? [] : await journal.memeShown.list(),
          ...(ambient ? { rareChance: 0 } : {}),
        });
        if (!reaction) return undefined;
        if (ambient) return { ...reaction, ambient: true };
        const shownAt = clock.now().toISOString();
        await journal.memeShown.put({
          id: event.eventId,
          packId: reaction.packId,
          ruleId: reaction.ruleId,
          sessionId: session.id,
          rarity: reaction.rarity,
          shownAt,
        });
        if (reaction.rarity === 'rare')
          await journal.outbox.add({
            eventId: context.createId(),
            type: 'easter_egg.triggered',
            version: 1,
            sourceEntityId: event.eventId,
            occurredAt: shownAt,
            payload: { cause: 'rare-reaction' },
          });
        return reaction;
      },
    },
  );
  return candidates.filter((reaction) => reaction !== undefined);
}
