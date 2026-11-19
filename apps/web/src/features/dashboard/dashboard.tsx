import { getDashboardSummary } from '@money-level/application';
import { formatMoney } from '@money-level/finance-core';
import { Button } from '@money-level/ui-kit';
import { useCallback } from 'react';
import { useJournal } from '../../app/journal-context.js';
import { useJournalQuery } from '../../app/use-journal-query.js';
import './dashboard.css';

const monthLabel = new Intl.DateTimeFormat('ru-RU', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export function Dashboard() {
  const { commands } = useJournal();
  const read = useCallback(
    () => getDashboardSummary(commands.storage),
    [commands.storage],
  );
  const { state, retry } = useJournalQuery(read);
  if (state.status === 'loading') return <p role="status">Загружаем баланс…</p>;
  if (state.status === 'error') {
    return (
      <section className="dashboard-state">
        <p role="alert">Не удалось загрузить баланс.</p>
        <Button variant="secondary" onClick={retry}>
          Повторить
        </Button>
      </section>
    );
  }

  const value = state.value;
  const money = (amount: string) => formatMoney(amount, value.currency);
  return (
    <section className="balance-panel" aria-labelledby="balance-title">
      <h1 id="balance-title">Общий баланс</h1>
      <p className="balance-total money-value" data-testid="total-balance">
        {money(value.totalMinor)}
      </p>

      <div className="balance-breakdown">
        <p className="balance-period">
          {monthLabel.format(new Date(value.period.from + 'T00:00:00.000Z'))}
        </p>
        <dl className="balance-flow">
          <div>
            <dt>Доходы</dt>
            <dd className="money-value balance-income" data-testid="income">
              {money(value.incomeMinor)}
            </dd>
          </div>
          <div>
            <dt>Расходы</dt>
            <dd className="money-value" data-testid="expenses">
              {money(value.expenseMinor)}
            </dd>
          </div>
        </dl>
      </div>
      <dl className="balance-availability">
        <div>
          <dt>Доступно к тратам</dt>
          <dd className="money-value" data-testid="available">
            {money(value.availableMinor)}
          </dd>
        </div>
        {value.reservedMinor !== '0' && (
          <div>
            <dt>В целях</dt>
            <dd className="money-value">{money(value.reservedMinor)}</dd>
          </div>
        )}
      </dl>
      {value.overReserved && (
        <p className="balance-warning" role="status">
          Резервы превышают баланс.
        </p>
      )}
    </section>
  );
}
