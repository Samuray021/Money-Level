import { recordAnalyticsOpened } from '@money-level/application';
import { useEffect } from 'react';
import { appSession } from '../../app/app-session.js';
import { useJournal } from '../../app/journal-context.js';

export function useReportOpened(kind: 'week' | 'month', periodStart?: string) {
  const { commands } = useJournal();
  useEffect(() => {
    if (periodStart)
      void recordAnalyticsOpened(
        commands,
        appSession().id,
        kind,
        periodStart,
      ).catch(() => undefined);
  }, [commands, kind, periodStart]);
}
