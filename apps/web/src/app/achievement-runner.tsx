import { runAchievementRules } from '@money-level/application';
import { useCallback, useEffect } from 'react';
import { useJournal } from './journal-context.js';
import { useJournalQuery } from './use-journal-query.js';

export function AchievementRunner() {
  const { commands, profile } = useJournal();
  const enabled = !!profile?.onboardingCompleted;
  const read = useCallback(
    () =>
      enabled
        ? commands.storage.read(async ({ outbox }) =>
            (await outbox.list()).map(({ eventId }) => eventId).join(','),
          )
        : Promise.resolve(''),
    [commands.storage, enabled],
  );
  const { state } = useJournalQuery(read);
  const trigger = state.status === 'ready' ? state.value : '';
  useEffect(() => {
    if (enabled && trigger)
      void runAchievementRules(commands).catch(() => undefined);
  }, [commands, enabled, trigger]);
  return null;
}
