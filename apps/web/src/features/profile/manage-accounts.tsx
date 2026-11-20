import {
  archiveAccount,
  createAccount,
  getAccountOverview,
  renameAccount,
} from '@money-level/application';
import { accountKindSchema } from '@money-level/contracts';
import type { AccountKind } from '@money-level/contracts';
import type { Account } from '@money-level/finance-core';
import { Button } from '@money-level/ui-kit';
import { useCallback, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useJournal } from '../../app/journal-context.js';
import { useJournalQuery } from '../../app/use-journal-query.js';
import { MoneyAmount } from '../../components/money-amount.js';
import './management.css';

const labels: Record<AccountKind, string> = {
  card: 'Карта',
  cash: 'Наличные',
  savings: 'Накопительный',
  other: 'Другое',
};

function AccountForm({
  entry,
  done,
}: {
  entry: Account | undefined;
  done: () => void;
}) {
  const { commands, profile } = useJournal();
  const [name, setName] = useState(entry?.name ?? '');
  const [kind, setKind] = useState<AccountKind>('card');
  const [openingAmount, setOpeningAmount] = useState('0');
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    setError(false);
    try {
      if (entry) await renameAccount(commands, entry.id, name);
      else
        await createAccount(commands, {
          name,
          kind,
          openingAmount: openingAmount.trim(),
        });
      done();
    } catch {
      setError(true);
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }
  return (
    <form
      className="form-card"
      onSubmit={submit}
      aria-label={entry ? 'Переименование счёта' : 'Новый счёт'}
    >
      <label className="form-field">
        Название счёта
        <input
          required
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      {!entry && (
        <>
          <label className="form-field">
            Тип счёта
            <select
              value={kind}
              onChange={(event) =>
                setKind(accountKindSchema.parse(event.target.value))
              }
            >
              {Object.entries(labels).map(([key, label]) => (
                <option value={key} key={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            Начальный остаток ({profile?.baseCurrency})
            <input
              required
              inputMode="decimal"
              maxLength={24}
              value={openingAmount}
              onChange={(event) => setOpeningAmount(event.target.value)}
            />
          </label>
        </>
      )}
      {error && (
        <p className="form-error" role="alert">
          Не удалось сохранить счёт. Проверьте введённые данные.
        </p>
      )}
      <div className="management-actions">
        <Button type="submit" busy={saving}>
          Сохранить
        </Button>
        <Button variant="secondary" disabled={saving} onClick={done}>
          Отмена
        </Button>
      </div>
    </form>
  );
}

export function ManageAccounts() {
  const { commands } = useJournal();
  const read = useCallback(
    () => getAccountOverview(commands.storage),
    [commands.storage],
  );
  const { state, retry } = useJournalQuery(read);
  const [edited, setEdited] = useState<Account | 'new' | null>(null);
  const [archiving, setArchiving] = useState('');
  const [error, setError] = useState(false);
  const [accountFilter, setAccountFilter] = useState('all');
  const rows =
    state.status === 'ready'
      ? state.value.filter(
          ({ account }) =>
            accountFilter === 'all' ||
            account.archived === (accountFilter === 'archived'),
        )
      : [];

  async function archive(account: Account) {
    if (archiving) return;
    setArchiving(account.id);
    setError(false);
    try {
      await archiveAccount(commands, account.id);
    } catch {
      setError(true);
    } finally {
      setArchiving('');
    }
  }

  return (
    <section className="management">
      <Link to="/profile">К профилю</Link>
      <h1>Счета</h1>
      {error && (
        <p className="form-error" role="alert">
          Не удалось архивировать счёт.
        </p>
      )}
      {state.status === 'loading' ? (
        <p role="status">Загружаем счета…</p>
      ) : state.status === 'error' ? (
        <>
          <p role="alert">Не удалось открыть список счетов.</p>
          <Button onClick={retry}>Повторить</Button>
        </>
      ) : (
        <>
          {edited === null ? (
            <Button onClick={() => setEdited('new')}>Добавить счёт</Button>
          ) : (
            <AccountForm
              key={edited === 'new' ? 'new' : edited.id}
              entry={edited === 'new' ? undefined : edited}
              done={() => setEdited(null)}
            />
          )}
          <label className="form-field">
            Показать счета
            <select
              value={accountFilter}
              onChange={(event) => setAccountFilter(event.target.value)}
            >
              <option value="all">Все</option>
              <option value="active">Активные</option>
              <option value="archived">Архивные</option>
            </select>
          </label>
          {rows.length === 0 && (
            <p className="form-intro">
              {state.value.length === 0
                ? 'Счетов пока нет.'
                : 'По фильтру счетов нет.'}
            </p>
          )}
          <ul className="management-list">
            {rows.map(({ account, balance, overdrawn }) => (
              <li className="management-row" key={account.id}>
                <div className="management-name">
                  <strong>{account.name}</strong>
                  <small>{labels[account.kind]}</small>
                  {account.archived && <small>В архиве</small>}
                </div>
                <span className="money-value">
                  <MoneyAmount
                    amount={balance}
                    currency={account.currencyCode}
                  />
                </span>
                {overdrawn && (
                  <p className="form-error" role="status">
                    Отрицательный остаток.
                  </p>
                )}
                {!account.archived && (
                  <div className="management-actions">
                    <Button
                      variant="secondary"
                      aria-label={'Переименовать ' + account.name}
                      onClick={() => setEdited(account)}
                    >
                      Переименовать
                    </Button>
                    <Button
                      variant="secondary"
                      aria-label={'Архивировать ' + account.name}
                      busy={archiving === account.id}
                      onClick={() => {
                        void archive(account);
                      }}
                    >
                      В архив
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
