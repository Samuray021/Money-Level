import {
  getBudgetOverview,
  saveBudget,
  setBudgetNoticesEnabled,
} from '@money-level/application';
import { currencyAmountForInput } from '@money-level/finance-core';
import { Button } from '@money-level/ui-kit';
import { useCallback, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useJournal } from '../../app/journal-context.js';
import { useJournalQuery } from '../../app/use-journal-query.js';
import { MoneyAmount } from '../../components/money-amount.js';
import './budgets.css';

type BudgetOverview = Awaited<ReturnType<typeof getBudgetOverview>>;
type Budget = BudgetOverview['rows'][number]['budget'];

function BudgetEditor({
  budget,
  categories,
  close,
}: {
  budget: Budget | undefined;
  categories: BudgetOverview['categories'];
  close: () => void;
}) {
  const { commands, profile } = useJournal();
  const currency = profile?.baseCurrency ?? 'RUB';
  const [categoryId, setCategoryId] = useState(budget?.categoryId ?? '');
  const [amount, setAmount] = useState(() =>
    budget ? currencyAmountForInput(budget.limitMinor, currency) : '',
  );
  const [active, setActive] = useState(budget?.active ?? true);
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
      await saveBudget(commands, {
        ...(budget ? { id: budget.id } : {}),
        ...(categoryId ? { categoryId } : {}),
        amount,
        active,
      });
      close();
    } catch {
      setError(true);
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }
  return (
    <form className="form-card" onSubmit={submit}>
      <label className="form-field">
        Категория
        <select
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
        >
          <option value="">Все расходы</option>
          {categories
            .filter(
              (item) =>
                item.id === budget?.categoryId ||
                (!item.archived && !item.deletedAt),
            )
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
        </select>
      </label>
      <label className="form-field">
        Лимит на месяц ({currency})
        <input
          required
          inputMode="decimal"
          maxLength={24}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </label>
      {budget && (
        <label className="form-checkbox">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />{' '}
          Бюджет активен
        </label>
      )}
      {error && (
        <p className="form-error" role="alert">
          Проверьте сумму и убедитесь, что для этой категории ещё нет активного
          бюджета.
        </p>
      )}
      <Button type="submit" busy={saving}>
        Сохранить бюджет
      </Button>
      <Button variant="secondary" disabled={saving} onClick={close}>
        Отмена
      </Button>
    </form>
  );
}

export function Budgets() {
  const { commands, profile, setProfile } = useJournal();
  const read = useCallback(
    () => getBudgetOverview(commands.storage, commands.clock),
    [commands],
  );
  const { state, retry } = useJournalQuery(read);
  const [edited, setEdited] = useState<Budget | 'new' | null>(null);
  const [error, setError] = useState(false);

  async function toggle(enabled: boolean) {
    setError(false);
    try {
      setProfile(await setBudgetNoticesEnabled(commands.storage, enabled));
    } catch {
      setError(true);
    }
  }
  return (
    <section className="budgets-page">
      <Link to="/analytics">К аналитике</Link>
      <h1>Бюджеты</h1>
      <label className="form-checkbox">
        <input
          type="checkbox"
          checked={profile?.budgetNotificationsEnabled ?? true}
          onChange={(event) => {
            void toggle(event.target.checked);
          }}
        />
        Уведомлять о лимитах
      </label>
      {error && (
        <p className="form-error" role="alert">
          Не удалось сохранить настройку уведомлений.
        </p>
      )}
      {state.status === 'loading' ? (
        <p role="status">Загружаем бюджеты…</p>
      ) : state.status === 'error' ? (
        <>
          <p role="alert">Не удалось загрузить бюджеты.</p>
          <Button onClick={retry}>Повторить</Button>
        </>
      ) : (
        <>
          {edited === null ? (
            <Button onClick={() => setEdited('new')}>Добавить бюджет</Button>
          ) : edited !== 'new' && profile?.balanceHidden ? (
            <div className="form-card">
              <p>Чтобы изменить бюджет, покажите суммы в верхней панели.</p>
              <Button variant="secondary" onClick={() => setEdited(null)}>
                Отмена
              </Button>
            </div>
          ) : (
            <BudgetEditor
              key={edited === 'new' ? 'new' : edited.id}
              budget={edited === 'new' ? undefined : edited}
              categories={state.value.categories}
              close={() => setEdited(null)}
            />
          )}
          {state.value.rows.length === 0 && (
            <p className="form-intro">Бюджетов на месяц пока нет.</p>
          )}
          {state.value.rows.map((row) => {
            const spent = BigInt(row.spentMinor);
            const limit = BigInt(row.budget.limitMinor);
            const progress =
              spent >= limit ? 100 : Number((spent * 100n) / limit);
            return (
              <article className="budget-card" key={row.budget.id}>
                <h2>{row.name}</h2>
                {!row.budget.active && (
                  <p className="form-intro">Бюджет выключен</p>
                )}
                <div className="budget-progress" aria-hidden="true">
                  <span style={{ width: progress + '%' }} />
                </div>
                <dl>
                  <div>
                    <dt>Потрачено</dt>
                    <dd>
                      <MoneyAmount amount={row.spentMinor} />
                    </dd>
                  </div>
                  <div>
                    <dt>Лимит</dt>
                    <dd>
                      <MoneyAmount amount={row.budget.limitMinor} />
                    </dd>
                  </div>
                  <div>
                    <dt>Осталось</dt>
                    <dd>
                      <MoneyAmount amount={row.remainingMinor} />
                    </dd>
                  </div>
                </dl>
                <Button
                  variant="secondary"
                  aria-label={'Изменить бюджет ' + row.name}
                  onClick={() => setEdited(row.budget)}
                >
                  Изменить
                </Button>
              </article>
            );
          })}
        </>
      )}
    </section>
  );
}
