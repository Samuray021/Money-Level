import {
  addExpense,
  addIncome,
  ensureStarterCategories,
  getTransactionChoices,
  transfer,
} from '@money-level/application';
import type { EntryKind } from '@money-level/application';
import { localTransactionDate, systemClock } from '@money-level/contracts';
import { parseCurrencyAmount } from '@money-level/finance-core';
import { Button } from '@money-level/ui-kit';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useJournal } from '../../app/journal-context.js';
import { useJournalQuery } from '../../app/use-journal-query.js';

type Choices = Awaited<ReturnType<typeof getTransactionChoices>>;

function EntryForm({ kind, choices }: { kind: EntryKind; choices: Choices }) {
  const { commands } = useJournal();
  const navigate = useNavigate();
  const { accounts, categories, profile } = choices;
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState(choices.accountId);
  const [categoryId, setCategoryId] = useState(choices.categoryId);
  const [destinationId, setDestinationId] = useState('');
  const [day, setDay] = useState(() =>
    localTransactionDate(
      (commands.clock ?? systemClock).now(),
      profile.timeZone,
    ),
  );
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [amountError, setAmountError] = useState('');
  const [saveError, setSaveError] = useState('');
  const inFlight = useRef(false);
  const destinations = accounts.filter((account) => account.id !== accountId);
  const toAccountId = destinations.some(
    (account) => account.id === destinationId,
  )
    ? destinationId
    : (destinations[0]?.id ?? '');
  const attempt = useRef({ signature: '', key: '' });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    setAmountError('');
    setSaveError('');
    let amountMinor: string;
    try {
      amountMinor = parseCurrencyAmount(amount.trim(), profile.baseCurrency);
    } catch {
      setAmountError(
        'Введите положительную сумму с допустимым числом знаков после запятой.',
      );
      return;
    }
    const fields = {
      amountMinor,
      accountId,
      transactionDate: day,
      ...(note.trim() ? { note } : {}),
    };
    const links = kind === 'transfer' ? { toAccountId } : { categoryId };
    const signature = JSON.stringify({ ...fields, ...links });
    if (attempt.current.signature !== signature)
      attempt.current = { signature, key: commands.createId() };
    const input = { ...fields, idempotencyKey: attempt.current.key };

    inFlight.current = true;
    setSaving(true);
    try {
      const context = { ...commands, baseCurrency: profile.baseCurrency };
      if (kind === 'transfer')
        await transfer(context, { ...input, toAccountId });
      else {
        const save = kind === 'income' ? addIncome : addExpense;
        await save(context, { ...input, categoryId });
      }
      navigate('/', { replace: true });
    } catch {
      setSaveError(
        'Не удалось сохранить операцию. Проверьте реквизиты и попробуйте ещё раз.',
      );
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <form className="form-card" onSubmit={submit}>
      <label className="form-field">
        Сумма ({profile.baseCurrency})
        <input
          required
          value={amount}
          inputMode="decimal"
          maxLength={24}
          onChange={(event) => setAmount(event.target.value)}
          aria-invalid={!!amountError}
          aria-describedby={amountError ? 'entry-amount-error' : undefined}
        />
      </label>
      {amountError && (
        <p className="form-error" id="entry-amount-error" role="alert">
          {amountError}
        </p>
      )}
      <label className="form-field">
        {kind === 'transfer' ? 'Со счёта' : 'Счёт'}
        <select
          required
          value={accountId}
          onChange={(event) => setAccountId(event.target.value)}
        >
          {accounts.map((account) => (
            <option value={account.id} key={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </label>
      {kind === 'transfer' ? (
        <label className="form-field">
          На счёт
          <select
            required
            value={toAccountId}
            onChange={(event) => setDestinationId(event.target.value)}
          >
            {destinations.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <label className="form-field">
          Категория
          <select
            required
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            {categories.map((category) => (
              <option value={category.id} key={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <details className="form-extra">
        <summary>Дата и заметка</summary>
        <label className="form-field">
          Дата операции
          <input
            required
            type="date"
            value={day}
            onChange={(event) => setDay(event.target.value)}
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
      </details>
      {saveError && (
        <p className="form-error" role="alert">
          {saveError}
        </p>
      )}
      <Button type="submit" busy={saving}>
        {saving ? 'Сохраняем…' : 'Сохранить'}
      </Button>
      <Link className="form-cancel" to="/">
        Отмена
      </Link>
    </form>
  );
}

export function TransactionEntry({ kind }: { kind: EntryKind }) {
  const { commands, profile } = useJournal();
  const [problem, setProblem] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const seeded = profile?.starterCategoriesReady;

  useEffect(() => {
    if (seeded) return;
    let active = true;
    void ensureStarterCategories(commands).catch(() => {
      if (active) setProblem(true);
    });
    return () => {
      active = false;
    };
  }, [commands, seeded, attempt]);

  const read = useCallback(
    () => getTransactionChoices(commands.storage, kind),
    [commands.storage, kind],
  );
  const { state, retry } = useJournalQuery(read);
  return (
    <section className="form-page">
      <h1>
        {kind === 'transfer'
          ? 'Перевод'
          : kind === 'income'
            ? 'Доход'
            : 'Расход'}
      </h1>
      {problem || state.status === 'error' ? (
        <>
          <p role="alert">Не удалось загрузить счета и категории.</p>
          <Button
            variant="secondary"
            onClick={() => {
              setProblem(false);
              setAttempt((value) => value + 1);
              retry();
            }}
          >
            Повторить
          </Button>
        </>
      ) : !seeded || state.status === 'loading' ? (
        <p role="status">Загружаем счета и категории…</p>
      ) : kind === 'transfer' && state.value.accounts.length < 2 ? (
        <p role="status">Для перевода нужны два активных счёта.</p>
      ) : !state.value.accounts.length ||
        (kind !== 'transfer' && !state.value.categories.length) ? (
        <p role="status">Нужен активный счёт и категория для этой операции.</p>
      ) : (
        <EntryForm key={kind} kind={kind} choices={state.value} />
      )}
    </section>
  );
}
