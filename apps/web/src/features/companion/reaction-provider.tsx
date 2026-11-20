import { resolveHumorPolicy, runMemeReactions } from '@money-level/application';
import { createSeededRandom } from '@money-level/contracts';
import type { MemeReaction } from '@money-level/meme-engine';
import { Button } from '@money-level/ui-kit';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  const [shown, setShown] = useState<{
    reaction: MemeReaction;
    mode: ReturnType<typeof resolveHumorPolicy>['mode'];
  }>();
  const {
    mode,
    profanity,
    reactions: enabled,
    motion,
    playSound,
    popups,
  } = resolveHumorPolicy(profile);
  const visible =
    enabled && shown?.mode === mode && (profanity || !shown.reaction.profanity)
      ? shown.reaction
      : undefined;
  const lastAudibleCandidate = useRef<MemeReaction | undefined>(undefined);

  const previousEnabled = useRef(enabled);
  const since = useRef(session.startedAt);

  useEffect(() => {
    if (enabled && !previousEnabled.current) since.current = Date.now();
    previousEnabled.current = enabled;
  }, [enabled]);

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
    if (!enabled) setShown(undefined);
    else if (trigger)
      void runMemeReactions(
        commands.storage,
        { ...session, startedAt: since.current },
        random,
        commands.clock,
      ).then(
        (queued) => {
          if (active && queued[0]) setShown({ reaction: queued[0], mode });
        },
        () => undefined,
      );
    return () => {
      active = false;
    };
  }, [commands, enabled, mode, profanity, random, session, trigger]);

  useEffect(() => {
    if (!shown) return;
    const timer = window.setTimeout(
      () => setShown(undefined),
      shown.reaction.displayMs,
    );
    return () => window.clearTimeout(timer);
  }, [shown]);

  useEffect(() => {
    if (!motion) document.documentElement.dataset.motion = 'off';
    else delete document.documentElement.dataset.motion;
    return () => {
      delete document.documentElement.dataset.motion;
    };
  }, [motion]);

  useEffect(() => {
    if (lastAudibleCandidate.current === visible) return;
    lastAudibleCandidate.current = visible;
    if (!visible || !playSound) return;
    const audio = new Audio('/audio/reaction.wav');
    void audio.play().catch(() => undefined);
    return () => audio.pause();
  }, [playSound, visible]);
  return (
    <ReactionContext.Provider value={visible}>
      {children}
      {visible && popups && (
        <aside
          className={'meme-toast meme-toast--' + visible.rarity}
          aria-label="Реакция компаньона"
        >
          <p role="status">{visible.text}</p>
          <Button
            variant="secondary"
            aria-label="Закрыть реакцию"
            onClick={() => setShown(undefined)}
          >
            ×
          </Button>
        </aside>
      )}
    </ReactionContext.Provider>
  );
}
