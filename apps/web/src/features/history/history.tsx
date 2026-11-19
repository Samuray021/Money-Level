import { getHistory, getHistoryDetail } from '@money-level/application';
import type { HistoryEntry } from '@money-level/application';
import type { TransactionKind } from '@money-level/contracts';
import { Button } from '@money-level/ui-kit';
import { useCallback } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useJournal } from '../../app/journal-context.js';
import { useJournalQuery } from '../../app/use-journal-query.js';
import { MoneyAmount } from '../../components/money-amount.js';
import './history.css';

const dateFormat = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const titles: Record<TransactionKind, string> = {
  opening: 'Начальный остаток',
  income: 'Доход',
  expense: 'Расход',
  transfer: 'Перевод',
  adjustment: 'Корректировка',
};

function formatDay(value: string): string {
  return dateFormat.format(new Date(value + 'T00:00:00.000Z'));
}

function TransactionAmount({ transaction }: Pick<HistoryEntry, 'transaction'>) {
  const { profile } = useJournal();
  const sign =
    transaction.kind === 'income'
      ? '+'
      : transaction.kind === 'expense'
        ? '−'
        : '';
  return (
    <span className="money-value">
      {!profile?.balanceHidden && sign}
      <MoneyAmount
        amount={transaction.amountMinor}
        currency={transaction.currencyCode}
      />
    </span>
  );
}

function HistoryRow({
  entry,
  search,
}: {
  entry: HistoryEntry;
  search: string;
}) {
  const { transaction, account, destination, category } = entry;
  const title = titles[transaction.kind];
  const accountName = account?.name ?? 'Удалённый счёт';
  const detail =
    transaction.kind === 'transfer'
      ? accountName + ' → ' + (destination?.name ?? 'Удалённый счёт')
      : accountName;
  return (
    <li>
      <Link className="history-row" to={'/history/' + transaction.id + search}>
        <span className="history-row-label">
          <strong>{category?.name ?? title}</strong>
          <span>
            {category ? title + ' · ' : ''}
            {detail}
          </span>
        </span>
        <TransactionAmount transaction={transaction} />
      </Link>
    </li>
  );
}

export function History() {
  const { commands } = useJournal();
  const { search } = useLocation();
  const read = useCallback(
    () => getHistory(commands.storage),
    [commands.storage],
  );
  const { state, retry } = useJournalQuery(read);
  return (
    <section className="history-page">
      <h1>История</h1>
      {state.status === 'loading' ? (
        <p role="status">Загружаем операции…</p>
      ) : state.status === 'error' ? (
        <>
          <p role="alert">Не удалось загрузить историю.</p>
          <Button variant="secondary" onClick={retry}>
            Повторить
          </Button>
        </>
      ) : state.value.length === 0 ? (
        <p className="form-intro">Пока нет доходов, расходов и переводов.</p>
      ) : (
        state.value.map(({ date, totals, entries }) => (
          <section className="history-day" key={date}>
            <header className="history-day-header">
              <h2>{formatDay(date)}</h2>
              <p>
                Доходы <MoneyAmount amount={totals.incomeMinor} /> · Расходы{' '}
                <MoneyAmount amount={totals.expenseMinor} />
              </p>
            </header>
            <ul className="history-list">
              {entries.map((entry) => (
                <HistoryRow
                  entry={entry}
                  key={entry.transaction.id}
                  search={search}
                />
              ))}
            </ul>
          </section>
        ))
      )}
    </section>
  );
}

export function HistoryDetail() {
  const { commands, profile } = useJournal();
  const { id } = useParams();
  const { search } = useLocation();
  const read = useCallback(
    () => getHistoryDetail(commands.storage, id),
    [commands.storage, id],
  );
  const { state, retry } = useJournalQuery(read);
  const back = <Link to={'/history' + search}>К истории</Link>;

  if (state.status === 'loading')
    return <p role="status">Загружаем операцию…</p>;
  if (state.status === 'error')
    return (
      <section className="history-page">
        {back}
        <p role="alert">Не удалось загрузить операцию.</p>
        <Button variant="secondary" onClick={retry}>
          Повторить
        </Button>
      </section>
    );
  if (!state.value)
    return (
      <section className="history-page">
        {back}
        <h1>Операция не найдена</h1>
      </section>
    );

  const { transaction, account, destination, category } = state.value;
  return (
    <section className="history-page">
      {back}
      <h1>{titles[transaction.kind]}</h1>
      <article className="history-card">
        <p className="history-detail-amount">
          <TransactionAmount transaction={transaction} />
        </p>
        <dl>
          <div>
            <dt>Дата операции</dt>
            <dd>{formatDay(transaction.transactionDate)}</dd>
          </div>
          <div>
            <dt>{transaction.kind === 'transfer' ? 'Со счёта' : 'Счёт'}</dt>
            <dd>{account?.name ?? 'Удалённый счёт'}</dd>
          </div>
          {transaction.kind === 'transfer' && (
            <div>
              <dt>На счёт</dt>
              <dd>{destination?.name ?? 'Удалённый счёт'}</dd>
            </div>
          )}
          {category && (
            <div>
              <dt>Категория</dt>
              <dd>{category.name}</dd>
            </div>
          )}
          {transaction.note && !profile?.balanceHidden && (
            <div>
              <dt>Заметка</dt>
              <dd>{transaction.note}</dd>
            </div>
          )}
        </dl>
      </article>
    </section>
  );
}
