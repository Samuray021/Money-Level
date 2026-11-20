import {
  recordAppSession,
  resolveHumorPolicy,
  runMemeReactions,
} from '@money-level/application';
import { createSeededRandom } from '@money-level/contracts';
import type { DeliveredReaction } from '@money-level/application';
import { Button } from '@money-level/ui-kit';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { appSession } from '../../app/app-session.js';
import { useJournal } from '../../app/journal-context.js';
import { useJournalQuery } from '../../app/use-journal-query.js';
import { ReactionContext } from './reaction-context.js';
import './companion.css';

export function ReactionProvider({ children }: { children: ReactNode }) {
  const { commands, profile } = useJournal();
  const [session] = useState(appSession);
  const [random] = useState(() =>
    createSeededRandom(crypto.getRandomValues(new Uint32Array(1))[0] ?? 0),
  );
  const [shown, setShown] = useState<{
    reaction: DeliveredReaction;
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
  const lastAudibleCandidate = useRef<DeliveredReaction | undefined>(undefined);

  const available = profile?.onboardingCompleted === true;
  useEffect(() => {
    if (available)
      void recordAppSession(commands, session.id).catch(() => undefined);
  }, [available, commands, session.id]);

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

  const policyKey = enabled
    ? [mode, profile?.humorFrequency, profanity].join(':')
    : '';
  const activePolicy = useRef('');
  useEffect(() => {
    activePolicy.current = policyKey;
    if (!policyKey) setShown(undefined);
    return () => {
      activePolicy.current = '';
    };
  }, [policyKey]);

  useEffect(() => {
    if (!policyKey || !trigger) return;
    void runMemeReactions(
      commands,
      { ...session, startedAt: since.current },
      random,
    ).then(
      (queued) => {
        if (activePolicy.current !== policyKey) return;
        const reaction =
          queued.find((candidate) => !candidate.ambient) ?? queued[0];
        if (!reaction) return;
        setShown((previous) =>
          reaction.ambient && previous && !previous.reaction.ambient
            ? previous
            : { reaction, mode },
        );
      },
      () => undefined,
    );
  }, [commands, mode, policyKey, random, session, trigger]);

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
    if (!visible || visible.ambient || !playSound) return;
    const audio = new Audio('/audio/reaction.wav');
    void audio.play().catch(() => undefined);
    return () => audio.pause();
  }, [playSound, visible]);
  return (
    <ReactionContext.Provider value={visible}>
      {children}
      {visible && !visible.ambient && popups && (
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
