import {
  createGoal,
  getGoalOverview,
  releaseFromGoal,
  reserveToGoal,
} from '@money-level/application';
import type { NewGoalInput } from '@money-level/application';
import { parseCurrencyAmount } from '@money-level/finance-core';
import { Button } from '@money-level/ui-kit';
import { useCallback, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useJournal } from '../../app/journal-context.js';
import { useJournalQuery } from '../../app/use-journal-query.js';
import { MoneyAmount } from '../../components/money-amount.js';
import './goals.css';

const goalIcons = {
  target: { label: 'Цель', symbol: '◎' },
  reserve: { label: 'Резерв', symbol: '◇' },
  gift: { label: 'Подарок', symbol: '☆' },
} as const satisfies Record<
  NonNullable<NewGoalInput['icon']>,
  { label: string; symbol: string }
>;

function knownIcon(icon: string): icon is keyof typeof goalIcons {
  return Object.hasOwn(goalIcons, icon);
}

type GoalRow = Awaited<ReturnType<typeof getGoalOverview>>[number];
const readableDate = new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'long',
  timeZone: 'UTC',
});

function CreateForm({ close }: { close: () => void }) {
  const { commands, profile } = useJournal();
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [date, setDate] = useState('');
  const [icon, setIcon] = useState<keyof typeof goalIcons>('target');
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setSaving(true);
    setError(false);
    try {
      await createGoal(commands, {
        title,
        target,
        icon,
        ...(date ? { targetDate: date } : {}),
      });
      close();
    } catch {
      setError(true);
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }
  return (
    <form className="form-card" onSubmit={submit}>
      <label className="form-field">
        Название
        <input
          required
          maxLength={100}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
      <label className="form-field">
        Целевая сумма ({profile?.baseCurrency})
        <input
          required
          inputMode="decimal"
          maxLength={24}
          value={target}
          onChange={(event) => setTarget(event.target.value)}
        />
      </label>
      <label className="form-field">
        Значок цели
        <select
          value={icon}
          onChange={(event) => {
            const value = event.target.value;
            if (knownIcon(value)) setIcon(value);
          }}
        >
          {Object.entries(goalIcons).map(([value, item]) => (
            <option key={value} value={value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className="form-field">
        Целевая дата
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          Не удалось создать цель. Проверьте название и сумму.
        </p>
      )}
      <Button type="submit" busy={saving}>
        Сохранить цель
      </Button>
      <Button variant="secondary" disabled={saving} onClick={close}>
        Отмена
      </Button>
    </form>
  );
}

function ReservationForm({
  id,
  action,
  close,
}: {
  id: string;
  action: 'reserve' | 'release';
  close: () => void;
}) {
  const { commands, profile } = useJournal();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const submitted = useRef<
    { amountMinor: string; allocationId: string } | undefined
  >(undefined);
  const reserving = action === 'reserve';
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || pending.current) return;
    setError('');
    pending.current = true;
    setSaving(true);
    try {
      const amountMinor = parseCurrencyAmount(
        amount.trim(),
        profile.baseCurrency,
      );
      const run = reserving ? reserveToGoal : releaseFromGoal;
      if (submitted.current?.amountMinor !== amountMinor)
        submitted.current = { amountMinor, allocationId: commands.createId() };
      await run(commands, { goalId: id, ...submitted.current });
      close();
    } catch {
      setError(
        reserving
          ? 'Проверьте сумму, доступные средства и остаток до цели.'
          : 'Проверьте сумму. Освободить можно только средства из резерва.',
      );
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }
  return (
    <form className="goal-reservation" onSubmit={submit}>
      <label className="form-field">
        Сумма ({profile?.baseCurrency})
        <input
          required
          inputMode="decimal"
          maxLength={24}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="goal-actions">
        <Button type="submit" busy={saving}>
          {reserving ? 'Подтвердить резерв' : 'Подтвердить снятие'}
        </Button>
        <Button variant="secondary" disabled={saving} onClick={close}>
          Отмена
        </Button>
      </div>
    </form>
  );
}

function GoalCard({ row }: { row: GoalRow }) {
  const { goal, reservedMinor } = row;
  const [action, setAction] = useState<'reserve' | 'release' | null>(null);
  const progress = Number(
    (BigInt(reservedMinor) * 100n) / BigInt(goal.targetMinor),
  );

  return (
    <article className="goal-card">
      <h2>
        <span aria-hidden="true">
          {goalIcons[knownIcon(goal.icon) ? goal.icon : 'target'].symbol}
        </span>{' '}
        {goal.title}
      </h2>
      {goal.status === 'completed' && (
        <p className="goal-completed">Цель достигнута</p>
      )}
      {goal.targetDate && (
        <p className="form-intro">
          До {readableDate.format(new Date(goal.targetDate + 'T00:00:00.000Z'))}
        </p>
      )}
      <progress max={100} value={progress} aria-label="Прогресс цели" />
      <dl>
        <div>
          <dt>В резерве</dt>
          <dd>
            <MoneyAmount amount={reservedMinor} />
          </dd>
        </div>
        <div>
          <dt>Целевая сумма</dt>
          <dd>
            <MoneyAmount amount={goal.targetMinor} />
          </dd>
        </div>
      </dl>
      {action ? (
        <ReservationForm
          key={action}
          action={action}
          id={goal.id}
          close={() => setAction(null)}
        />
      ) : (
        <div className="goal-actions">
          {goal.status === 'active' && (
            <Button onClick={() => setAction('reserve')}>Выделить</Button>
          )}
          {reservedMinor !== '0' && (
            <Button variant="secondary" onClick={() => setAction('release')}>
              Снять резерв
            </Button>
          )}
        </div>
      )}
    </article>
  );
}

export function Goals() {
  const { commands } = useJournal();
  const read = useCallback(
    () => getGoalOverview(commands.storage),
    [commands.storage],
  );
  const { state, retry } = useJournalQuery(read);
  const [creating, setCreating] = useState(false);

  return (
    <section className="goals-page">
      <h1>Цели</h1>
      {creating ? (
        <CreateForm close={() => setCreating(false)} />
      ) : (
        <Button onClick={() => setCreating(true)}>Добавить цель</Button>
      )}
      {state.status === 'loading' ? (
        <p role="status">Загружаем цели…</p>
      ) : state.status === 'error' ? (
        <>
          <p role="alert">Не удалось загрузить цели.</p>
          <Button onClick={retry}>Повторить</Button>
        </>
      ) : state.value.length === 0 ? (
        <p className="form-intro">Целей пока нет.</p>
      ) : (
        state.value.map((row) => <GoalCard key={row.goal.id} row={row} />)
      )}
    </section>
  );
}
