import { getHistory, getHistoryDetail } from '@money-level/application';
import type {
  HistoryDay,
  HistoryEntry,
  HistoryFilters,
} from '@money-level/application';
import type { TransactionKind } from '@money-level/contracts';
import { Button } from '@money-level/ui-kit';
import { useCallback, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useJournal } from '../../app/journal-context.js';
import { useJournalQuery } from '../../app/use-journal-query.js';
import { MoneyAmount } from '../../components/money-amount.js';
import { EntryActions, UndoDeletion } from './delete-entry.js';
import { HistoryFilterForm } from './history-filters.js';
import type { HistoryNavigationState } from './history-filters.js';
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
  filters,
  pageNumber,
}: {
  entry: HistoryEntry;
  filters: HistoryFilters;
  pageNumber: number;
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
      <Link
        className="history-row"
        to={'/history/' + transaction.id}
        state={{ historyFilters: filters, historyPage: pageNumber }}
      >
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

const pageSize = 50;

function HistoryPages({
  days,
  filters,
  requestedPage,
  setPage,
}: {
  days: HistoryDay[];
  filters: HistoryFilters;
  requestedPage: number;
  setPage: (value: number) => void;
}) {
  const position = useRef<HTMLParagraphElement>(null);
  const count = days.reduce((total, day) => total + day.entries.length, 0);
  const lastPage = Math.ceil(count / pageSize) - 1;
  const page = Math.min(requestedPage, lastPage);
  const start = page * pageSize;
  const end = Math.min(start + pageSize, count);
  const visible: HistoryDay[] = [];
  let offset = 0;
  for (const day of days) {
    const next = offset + day.entries.length;
    if (offset >= end) break;
    if (next > start) {
      visible.push({
        ...day,
        entries: day.entries.slice(Math.max(0, start - offset), end - offset),
      });
    }
    offset = next;
  }

  function move(value: number) {
    setPage(value);
    position.current?.focus();
  }

  return (
    <>
      {lastPage > 0 && (
        <p
          className="history-page-position"
          ref={position}
          role="status"
          tabIndex={-1}
        >
          Операции {start + 1}–{end} из {count.toLocaleString('ru-RU')}
        </p>
      )}
      {visible.map(({ date, totals, entries }) => (
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
                filters={filters}
                pageNumber={page}
              />
            ))}
          </ul>
        </section>
      ))}
      {lastPage > 0 && (
        <nav className="history-actions" aria-label="Страницы истории">
          <Button
            variant="secondary"
            disabled={page === 0}
            onClick={() => move(page - 1)}
          >
            Предыдущая
          </Button>
          <Button
            variant="secondary"
            disabled={page === lastPage}
            onClick={() => move(page + 1)}
          >
            Следующая
          </Button>
        </nav>
      )}
    </>
  );
}

export function History() {
  const { commands } = useJournal();
  const location = useLocation();
  const previous = location.state as HistoryNavigationState;
  const [filters, setFilters] = useState<HistoryFilters>(
    previous?.historyFilters ?? {},
  );
  const [page, setPage] = useState(previous?.historyPage ?? 0);
  const read = useCallback(
    async () => ({ ...(await getHistory(commands.storage, filters)), filters }),
    [commands.storage, filters],
  );
  const { state, retry } = useJournalQuery(read);
  const invalidRange =
    !!filters.from && !!filters.to && filters.from > filters.to;
  const active = Object.values(filters).some(Boolean);
  return (
    <section className="history-page">
      <h1>История</h1>
      {previous?.undo && (
        <UndoDeletion key={previous.undo.deletedAt} deletion={previous.undo} />
      )}
      <HistoryFilterForm
        filters={filters}
        options={state.status === 'ready' ? state.value : undefined}
        onChange={(next) => {
          setFilters(next);
          setPage(0);
        }}
      />
      {state.status === 'loading' ||
      (state.status === 'ready' && state.value.filters !== filters) ? (
        <p role="status">Загружаем операции…</p>
      ) : state.status === 'error' ? (
        <>
          <p role="alert">Не удалось загрузить историю.</p>
          <Button variant="secondary" onClick={retry}>
            Повторить
          </Button>
        </>
      ) : invalidRange ? (
        <p className="form-error" role="alert">
          Дата начала должна быть раньше даты окончания или совпадать с ней.
        </p>
      ) : state.value.days.length === 0 ? (
        <p className="form-intro">
          {active
            ? 'По этим фильтрам операций нет.'
            : 'Пока нет доходов, расходов и переводов.'}
        </p>
      ) : (
        <HistoryPages
          days={state.value.days}
          filters={filters}
          requestedPage={page}
          setPage={setPage}
        />
      )}
    </section>
  );
}

export function HistoryDetail() {
  const { commands, profile } = useJournal();
  const { id } = useParams();
  const location = useLocation();
  const previous = location.state as HistoryNavigationState;
  const read = useCallback(
    () => getHistoryDetail(commands.storage, id),
    [commands.storage, id],
  );
  const { state, retry } = useJournalQuery(read);
  const back = (
    <Link to="/history" state={previous}>
      К истории
    </Link>
  );

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
      <EntryActions id={transaction.id} />
    </section>
  );
}
