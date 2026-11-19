import { Link } from 'react-router-dom';
import { getDashboardSummary } from '@money-level/application';
import { Button } from '@money-level/ui-kit';
import { useCallback } from 'react';
import { useJournal } from '../../app/journal-context.js';
import { useJournalQuery } from '../../app/use-journal-query.js';
import { MoneyAmount } from '../../components/money-amount.js';
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
  return (
    <div className="dashboard-stack">
      <section className="balance-panel" aria-labelledby="balance-title">
        <h1 id="balance-title">Общий баланс</h1>
        <p className="balance-total money-value" data-testid="total-balance">
          <MoneyAmount amount={value.totalMinor} currency={value.currency} />
        </p>

        <div className="balance-breakdown">
          <p className="balance-period">
            {monthLabel.format(new Date(value.period.from + 'T00:00:00.000Z'))}
          </p>
          <dl className="balance-flow">
            <div>
              <dt>Доходы</dt>
              <dd className="money-value balance-income" data-testid="income">
                <MoneyAmount
                  amount={value.incomeMinor}
                  currency={value.currency}
                />
              </dd>
            </div>
            <div>
              <dt>Расходы</dt>
              <dd className="money-value" data-testid="expenses">
                <MoneyAmount
                  amount={value.expenseMinor}
                  currency={value.currency}
                />
              </dd>
            </div>
          </dl>
        </div>
        <dl className="balance-availability">
          <div>
            <dt>Доступно к тратам</dt>
            <dd className="money-value" data-testid="available">
              <MoneyAmount
                amount={value.availableMinor}
                currency={value.currency}
              />
            </dd>
          </div>
          {value.reservedMinor !== '0' && (
            <div>
              <dt>В целях</dt>
              <dd className="money-value">
                <MoneyAmount
                  amount={value.reservedMinor}
                  currency={value.currency}
                />
              </dd>
            </div>
          )}
        </dl>
        {value.overReserved && (
          <p className="balance-warning" role="status">
            Резервы превышают баланс.
          </p>
        )}
      </section>
      <div className="dashboard-actions">
        <Link
          className="ml-button ml-button--secondary"
          to="/transactions/transfer"
        >
          Перевод
        </Link>
        <Link
          className="ml-button ml-button--secondary"
          to="/transactions/expense"
        >
          <span aria-hidden="true">−</span> Расход
        </Link>

        <Link
          className="ml-button ml-button--primary"
          to="/transactions/income"
        >
          <span aria-hidden="true">+</span> Доход
        </Link>
      </div>
    </div>
  );
}
