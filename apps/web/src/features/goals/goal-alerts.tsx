import { claimGoalCompletionNotices } from '@money-level/application';
import { Button } from '@money-level/ui-kit';
import { useCallback, useEffect, useState } from 'react';
import { appSession } from '../../app/app-session.js';
import { useJournal } from '../../app/journal-context.js';
import { useJournalQuery } from '../../app/use-journal-query.js';

export function GoalAlerts() {
  const { commands } = useJournal();
  const { startedAt } = appSession();
  const [count, setCount] = useState(0);
  const read = useCallback(
    () =>
      commands.storage.read(async ({ outbox }) =>
        (await outbox.list())
          .filter(
            (event) =>
              event.type === 'goal.completed' &&
              Date.parse(event.occurredAt) >= startedAt,
          )
          .map((event) => event.eventId)
          .join(','),
      ),
    [commands.storage, startedAt],
  );
  const { state } = useJournalQuery(read);
  const events = state.status === 'ready' ? state.value : '';
  useEffect(() => {
    if (events)
      void claimGoalCompletionNotices(commands, startedAt).then(
        (noticeCount) => {
          if (noticeCount > 0) setCount((previous) => previous + noticeCount);
        },
        () => undefined,
      );
  }, [commands, events, startedAt]);

  if (count === 0) return null;
  return (
    <aside className="goal-notice" aria-label="Уведомление о целях">
      <p role="status">
        {count === 1 ? 'Цель достигнута.' : `Достигнуто целей — ${count}.`}
      </p>
      <Button variant="secondary" onClick={() => setCount(0)}>
        Закрыть уведомление о целях
      </Button>
    </aside>
  );
}
