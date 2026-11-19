import {
  getHistoryDetail,
  getTransactionChoices,
  updateTransaction,
} from '@money-level/application';
import type { HistoryEntry } from '@money-level/application';
import {
  currencyAmountForInput,
  parseCurrencyAmount,
} from '@money-level/finance-core';
import type { Account, Category } from '@money-level/finance-core';
import { Button } from '@money-level/ui-kit';
import { useCallback, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useJournal } from '../../app/journal-context.js';
import { useJournalQuery } from '../../app/use-journal-query.js';

type Choices = Awaited<ReturnType<typeof getTransactionChoices>>;

function withCurrent<Item extends Account | Category>(
  choices: Item[],
  current: Item | undefined,
): Item[] {
  return current && !choices.some(({ id }) => id === current.id)
    ? [...choices, current]
    : choices;
}

function EditForm({
  entry,
  choices,
  back,
}: {
  entry: HistoryEntry;
  choices: Choices;
  back: string;
}) {
  const { commands } = useJournal();
  const navigate = useNavigate();
  const location = useLocation();
  const { transaction } = entry;
  const { kind } = transaction;
  const system = kind === 'opening' || kind === 'adjustment';
  const categorized = kind === 'income' || kind === 'expense';
  const [amount, setAmount] = useState(() =>
    currencyAmountForInput(transaction.amountMinor, transaction.currencyCode),
  );
  const [date, setDate] = useState(transaction.transactionDate);
  const [note, setNote] = useState(transaction.note ?? '');
  const [accountId, setAccountId] = useState(transaction.accountId);
  const [categoryId, setCategoryId] = useState(
    categorized ? transaction.categoryId : '',
  );
  const [destination, setDestination] = useState(
    kind === 'transfer' ? transaction.toAccountId : '',
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  const sources = withCurrent(choices.accounts, entry.account);
  const categories = withCurrent(choices.categories, entry.category);
  const targets = withCurrent(choices.accounts, entry.destination).filter(
    ({ id }) => id !== accountId,
  );
  const toAccountId = targets.some(({ id }) => id === destination)
    ? destination
    : (targets[0]?.id ?? '');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    setError('');
    let amountMinor: string;
    try {
      amountMinor = parseCurrencyAmount(
        amount.trim(),
        transaction.currencyCode,
        {
          allowNegative: system,
          allowZero: system,
        },
      );
    } catch {
      setError('Проверьте сумму и число знаков после запятой.');
      return;
    }
    inFlight.current = true;
    setSaving(true);
    try {
      await updateTransaction(
        { ...commands, baseCurrency: choices.profile.baseCurrency },
        transaction.id,
        {
          amountMinor,
          accountId,
          transactionDate: date,
          note: note.trim() ? note : null,
          ...(categorized ? { categoryId } : {}),
          ...(kind === 'transfer' ? { toAccountId } : {}),
        },
      );
      void navigate(back, { replace: true, state: location.state });
    } catch {
      setError('Изменения не сохранены. Проверьте выбранные данные.');
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <form className="form-card" onSubmit={submit}>
      <label className="form-field">
        Сумма ({transaction.currencyCode})
        <input
          inputMode="decimal"
          required
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </label>
      <label className="form-field">
        {kind === 'transfer' ? 'Со счёта' : 'Счёт'}
        <select
          required
          value={accountId}
          onChange={(event) => setAccountId(event.target.value)}
        >
          {sources.map(({ id, name }) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </label>
      {kind === 'transfer' && (
        <label className="form-field">
          На счёт
          <select
            required
            value={toAccountId}
            onChange={(event) => setDestination(event.target.value)}
          >
            {targets.map(({ id, name }) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
      )}
      {categorized && (
        <label className="form-field">
          Категория
          <select
            required
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            {categories.map(({ id, name }) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="form-field">
        Дата операции
        <input
          type="date"
          required
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </label>
      <label className="form-field">
        Заметка
        <textarea
          maxLength={500}
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" busy={saving}>
        {saving ? 'Сохраняем…' : 'Сохранить изменения'}
      </Button>
      <Link className="form-cancel" to={back} state={location.state}>
        Отмена
      </Link>
    </form>
  );
}

export function EditEntry() {
  const { commands, profile } = useJournal();
  const location = useLocation();
  const { id } = useParams();
  const back = '/history/' + (id ?? '');
  const read = useCallback(async () => {
    const entry = await getHistoryDetail(commands.storage, id);
    if (!entry) return undefined;
    const kind = entry.transaction.kind;
    const choices = await getTransactionChoices(
      commands.storage,
      kind === 'income' || kind === 'expense' ? kind : 'transfer',
    );
    return { entry, choices };
  }, [commands.storage, id]);
  const { state, retry } = useJournalQuery(read);

  return (
    <section className="form-page">
      <Link to={back} state={location.state}>
        К операции
      </Link>
      <h1>Изменить операцию</h1>
      {profile?.balanceHidden ? (
        <p className="form-intro">
          Чтобы редактировать операцию, покажите суммы в верхней панели.
        </p>
      ) : state.status === 'loading' ? (
        <p role="status">Загружаем операцию…</p>
      ) : state.status === 'error' ? (
        <>
          <p role="alert">Не удалось загрузить операцию.</p>
          <Button onClick={retry}>Повторить</Button>
        </>
      ) : state.value ? (
        <EditForm key={location.key} {...state.value} back={back} />
      ) : (
        <p>Операция не найдена.</p>
      )}
    </section>
  );
}
