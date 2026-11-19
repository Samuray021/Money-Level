import { runMemeReactions } from '@money-level/application';
import { createSeededRandom } from '@money-level/contracts';
import type { MemeReaction } from '@money-level/meme-engine';
import { Button } from '@money-level/ui-kit';
import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useJournal } from '../../app/journal-context.js';
import { useJournalQuery } from '../../app/use-journal-query.js';
import { ReactionContext } from './reaction-context.js';
import './companion.css';

function tabSession() {
  const next = { id: crypto.randomUUID(), startedAt: Date.now() };
  try {
    const raw = sessionStorage.getItem('money-level-meme-session');
    if (raw) {
      const stored = JSON.parse(raw) as Partial<typeof next>;
      if (typeof stored.id === 'string' && typeof stored.startedAt === 'number')
        return { id: stored.id, startedAt: stored.startedAt };
    }
    sessionStorage.setItem('money-level-meme-session', JSON.stringify(next));
  } catch {
    // A private browser can keep a session in memory.
  }
  return next;
}

export function ReactionProvider({ children }: { children: ReactNode }) {
  const { commands, profile } = useJournal();
  const [session] = useState(tabSession);
  const [random] = useState(() =>
    createSeededRandom(crypto.getRandomValues(new Uint32Array(1))[0] ?? 0),
  );
  const [reaction, setReaction] = useState<MemeReaction>();
  const enabled =
    !!profile?.onboardingCompleted &&
    profile.humorMode !== 'off' &&
    profile.humorFrequency !== 'off';

  const read = useCallback(
    () =>
      enabled
        ? commands.storage.read(async ({ outbox }) => {
            const recent = (await outbox.list()).filter(
              ({ occurredAt }) => Date.parse(occurredAt) >= session.startedAt,
            );
            return recent.map(({ eventId }) => eventId).join(',');
          })
        : Promise.resolve(''),
    [commands.storage, enabled, session.startedAt],
  );
  const { state } = useJournalQuery(read);
  const trigger = state.status === 'ready' ? state.value : '';

  useEffect(() => {
    let active = true;
    if (!enabled) setReaction(undefined);
    else if (trigger)
      void runMemeReactions(
        commands.storage,
        session,
        random,
        commands.clock,
      ).then(
        (queued) => {
          if (active && queued[0]) setReaction(queued[0]);
        },
        () => undefined,
      );
    return () => {
      active = false;
    };
  }, [commands, enabled, random, session, trigger]);

  useEffect(() => {
    if (!reaction) return;
    const timer = window.setTimeout(
      () => setReaction(undefined),
      reaction.displayMs,
    );
    return () => window.clearTimeout(timer);
  }, [reaction]);

  const visible = enabled ? reaction : undefined;
  return (
    <ReactionContext.Provider value={visible}>
      {children}
      {visible && (
        <aside
          className={'meme-toast meme-toast--' + visible.rarity}
          aria-label="Реакция компаньона"
        >
          <p role="status">{visible.text}</p>
          <Button
            variant="secondary"
            aria-label="Закрыть реакцию"
            onClick={() => setReaction(undefined)}
          >
            ×
          </Button>
        </aside>
      )}
    </ReactionContext.Provider>
  );
}
