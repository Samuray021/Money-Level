import {
  claimBudgetNotices,
  getBudgetOverview,
} from '@money-level/application';
import { Button } from '@money-level/ui-kit';
import { useCallback, useEffect, useState } from 'react';
import { useJournal } from '../../app/journal-context.js';
import { useJournalQuery } from '../../app/use-journal-query.js';
import './budgets.css';

type Notices = Awaited<ReturnType<typeof claimBudgetNotices>>;

export function BudgetAlerts() {
  const { commands, profile } = useJournal();
  const read = useCallback(
    () => getBudgetOverview(commands.storage, commands.clock),
    [commands],
  );
  const { state } = useJournalQuery(read);
  const [notices, setNotices] = useState<Notices>([]);
  const due =
    state.status === 'ready' && state.value.enabled
      ? state.value.rows
          .filter((row) => row.newThresholds.length > 0)
          .map(
            ({ budget, newThresholds }) =>
              budget.id + ':' + newThresholds.join(','),
          )
          .join('/')
      : '';

  useEffect(() => {
    if (due)
      void claimBudgetNotices(commands).then(
        (current) => {
          if (current.length > 0) setNotices(current);
        },
        () => undefined,
      );
  }, [commands, due]);

  if (!profile?.budgetNotificationsEnabled || notices.length === 0) return null;
  return (
    <aside className="budget-alerts" aria-label="Уведомления бюджетов">
      <ul role="status">
        {notices.map(({ id, label, threshold }) => (
          <li key={id}>
            <strong>{label}.</strong>{' '}
            {threshold === 'over'
              ? 'Лимит превышен.'
              : threshold === '100'
                ? 'Лимит достигнут.'
                : 'Потрачено не менее 80% лимита.'}
          </li>
        ))}
      </ul>
      <Button variant="secondary" onClick={() => setNotices([])}>
        Закрыть уведомление
      </Button>
    </aside>
  );
}
