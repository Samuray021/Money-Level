import { getRoastReport } from '@money-level/application';
import type { RoastPeriod } from '@money-level/application';
import type { RoastCard } from '@money-level/meme-engine';
import { Button } from '@money-level/ui-kit';
import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useJournal } from '../../app/journal-context.js';
import { useJournalQuery } from '../../app/use-journal-query.js';
import { MoneyAmount } from '../../components/money-amount.js';
import { RoastCardExport } from './roast-card-export.js';
import './analytics.css';

const date = new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'medium',
  timeZone: 'UTC',
});
const counts = new Intl.NumberFormat('ru-RU');

function nextSeed() {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
}

function stat(card: RoastCard) {
  switch (card.kind) {
    case 'total':
      return (
        <strong>
          <MoneyAmount amount={card.amountMinor} />
        </strong>
      );
    case 'frequency':
      return <strong>{counts.format(card.count)}</strong>;
    case 'category':
      return (
        <p>
          {card.category} · <MoneyAmount amount={card.amountMinor} />
        </p>
      );
    case 'comparison':
      return (
        <p>
          <MoneyAmount amount={card.currentMinor} /> сейчас ·{' '}
          <MoneyAmount amount={card.priorMinor} /> ранее
        </p>
      );
    default:
      return null;
  }
}

export function RoastReport() {
  const { commands, profile } = useJournal();
  const [kind, setKind] = useState<RoastPeriod>('month');
  const [seed, setSeed] = useState(nextSeed);
  const read = useCallback(
    () => getRoastReport(commands.storage, kind, seed, commands.clock),
    [commands, kind, seed],
  );
  const { state, retry } = useJournalQuery(read);

  return (
    <section className="analytics-page">
      <Link to="/analytics">К аналитике</Link>
      <h1>
        {profile?.profanityEnabled && profile.humorMode !== 'off'
          ? 'Разъеби мои финансы'
          : 'Разбор расходов'}
      </h1>
      <label className="form-field analytics-month">
        Период
        <select
          value={kind}
          onChange={(event) =>
            setKind(event.target.value === 'week' ? 'week' : 'month')
          }
        >
          <option value="month">Месяц</option>
          <option value="week">Неделя</option>
        </select>
      </label>
      {state.status === 'error' ? (
        <>
          <p role="alert">Не удалось загрузить разбор.</p>
          <Button variant="secondary" onClick={retry}>
            Повторить
          </Button>
        </>
      ) : state.status === 'loading' ||
        state.value.kind !== kind ||
        state.value.seed !== seed ? (
        <p role="status">Собираем разбор…</p>
      ) : (
        <>
          <p className="form-intro">
            {date.format(new Date(state.value.period.from))} —{' '}
            {date.format(new Date(state.value.period.to))}
          </p>
          {state.value.cards.map((card) => (
            <article className="analytics-card roast-card" key={card.kind}>
              <h2>{card.text}</h2>
              {stat(card)}
              <details>
                <summary>Откуда цифры?</summary>
                <p>{card.formula}</p>
              </details>
              {profile && (
                <RoastCardExport
                  key={String(profile.balanceHidden)}
                  card={card}
                  profile={profile}
                />
              )}
            </article>
          ))}
          {state.value.cards.length > 1 && profile?.humorMode !== 'off' && (
            <Button variant="secondary" onClick={() => setSeed(nextSeed())}>
              Другие реплики
            </Button>
          )}
        </>
      )}
    </section>
  );
}
