import { Link } from 'react-router-dom';
import { getAnalyticsReport } from '@money-level/application';
import { localTransactionDate, systemClock } from '@money-level/contracts';
import { Button } from '@money-level/ui-kit';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useJournal } from '../../app/journal-context.js';
import { useJournalQuery } from '../../app/use-journal-query.js';
import { MoneyAmount } from '../../components/money-amount.js';
import './analytics.css';

type Report = Awaited<ReturnType<typeof getAnalyticsReport>>;
const dateLabel = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

function label(day: string): string {
  return dateLabel.format(new Date(day + 'T00:00:00.000Z'));
}

function share(value: bigint, whole: bigint): number {
  return whole > 0n ? Number((value * 10_000n) / whole) / 100 : 0;
}

function changeLabel(current: string, previous: string): string | null {
  const base = BigInt(previous);
  if (base === 0n) return null;
  const difference = BigInt(current) - base;
  const magnitude = difference < 0n ? -difference : difference;
  const tenths = (magnitude * 1000n + base / 2n) / base;
  const sign = difference > 0n ? '+' : difference < 0n ? '−' : '';
  return (
    sign + (tenths / 10n).toString() + ',' + (tenths % 10n).toString() + '%'
  );
}

function ExpenseTrend({ daily }: { daily: Report['daily'] }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const node = canvas.current;
    const context = node?.getContext('2d');
    if (!node || !context) return;
    const colors = getComputedStyle(node);
    const { width, height } = node;
    const values = daily.map(({ amountMinor }) => BigInt(amountMinor));
    const max = values.reduce(
      (left, right) => (right > left ? right : left),
      0n,
    );
    const inset = 12;
    const graphHeight = height - 2 * inset;
    context.clearRect(0, 0, width, height);
    context.strokeStyle = colors.getPropertyValue('--color-border').trim();
    context.lineWidth = 1.5;
    for (const fraction of [0, 0.5, 1]) {
      const guide = inset + graphHeight * fraction;
      context.beginPath();
      context.moveTo(inset, guide);
      context.lineTo(width - inset, guide);
      context.stroke();
    }
    context.strokeStyle = colors.getPropertyValue('--color-accent').trim();
    context.lineWidth = 5;
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.beginPath();
    const step = (width - 2 * inset) / Math.max(1, values.length - 1);
    values.forEach((value, index) => {
      const x = inset + index * step;
      const y = inset + graphHeight * (1 - share(value, max) / 100);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.stroke();
  }, [daily]);

  return (
    <section className="analytics-card">
      <h2>Расходы по дням</h2>
      <canvas ref={canvas} width={960} height={260} aria-hidden="true" />
      <div className="analytics-axis" aria-hidden="true">
        {daily[0] && <span>{label(daily[0].date)}</span>}
        {daily.at(-1) && <span>{label(daily.at(-1)!.date)}</span>}
      </div>
      <details>
        <summary>Таблица расходов по дням</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Дата</th>
              <th scope="col">Расходы</th>
            </tr>
          </thead>
          <tbody>
            {daily.map(({ date, amountMinor }) => (
              <tr key={date}>
                <th scope="row">{label(date)}</th>
                <td>
                  <MoneyAmount amount={amountMinor} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}

function AnalyticsResults({ report }: { report: Report }) {
  const { profile } = useJournal();
  const { totals, previousTotals, byCategory } = report;
  if (totals.incomeMinor === '0' && totals.expenseMinor === '0') {
    return <p className="form-intro">За этот месяц пока нет данных.</p>;
  }
  const change = changeLabel(totals.expenseMinor, previousTotals.expenseMinor);
  const fields = [
    ['Доходы', totals.incomeMinor],
    ['Расходы', totals.expenseMinor],
    ['Чистый поток', totals.netMinor],
  ] as const;
  return (
    <>
      <dl className="analytics-totals">
        {fields.map(([name, amount]) => (
          <div key={name}>
            <dt>{name}</dt>
            <dd className="money-value">
              <MoneyAmount amount={amount} />
            </dd>
          </div>
        ))}
      </dl>
      {!profile?.balanceHidden && (
        <p className="form-intro">
          {change
            ? change + ' к расходам прошлого месяца'
            : 'Нет базы для сравнения расходов с прошлым месяцем.'}
        </p>
      )}
      {byCategory.length > 0 ? (
        <>
          <section className="analytics-card">
            <h2>Расходы по категориям</h2>
            <ul className="analytics-categories">
              {byCategory
                .slice(0, 5)
                .map(({ categoryId, name, amountMinor }) => (
                  <li key={categoryId}>
                    <div>
                      <strong>{name}</strong>
                      <MoneyAmount amount={amountMinor} />
                    </div>
                    <div className="analytics-bar" aria-hidden="true">
                      <span
                        style={{
                          width:
                            share(
                              BigInt(amountMinor),
                              BigInt(totals.expenseMinor),
                            ) + '%',
                        }}
                      />
                    </div>
                  </li>
                ))}
            </ul>
            {byCategory.length > 5 && (
              <details>
                <summary>Все категории</summary>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Категория</th>
                      <th scope="col">Расходы</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byCategory.map(({ categoryId, name, amountMinor }) => (
                      <tr key={categoryId}>
                        <th scope="row">{name}</th>
                        <td>
                          <MoneyAmount amount={amountMinor} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            )}
          </section>
          <ExpenseTrend daily={report.daily} />
        </>
      ) : (
        <p className="form-intro">За этот месяц расходов нет.</p>
      )}
    </>
  );
}

export function Analytics() {
  const { commands, profile } = useJournal();
  const [month, setMonth] = useState(() =>
    localTransactionDate(
      (commands.clock ?? systemClock).now(),
      profile?.timeZone ?? 'UTC',
    ).slice(0, 7),
  );
  const read = useCallback(
    () => getAnalyticsReport(commands.storage, month),
    [commands.storage, month],
  );
  const { state, retry } = useJournalQuery(read);
  return (
    <section className="analytics-page">
      <h1>Аналитика</h1>
      <div className="analytics-links">
        <Link to="/analytics/budgets">Бюджеты</Link>
        <Link to="/analytics/roast">
          {profile?.profanityEnabled && profile.humorMode !== 'off'
            ? 'Разъеби мои финансы'
            : 'Разбор расходов'}
        </Link>
      </div>
      <label className="form-field analytics-month">
        Месяц
        <input
          type="month"
          value={month}
          onChange={(event) => {
            if (/^\d{4}-(?:0[1-9]|1[0-2])$/.test(event.target.value))
              setMonth(event.target.value);
          }}
        />
      </label>
      {state.status === 'error' ? (
        <>
          <p role="alert">Не удалось загрузить отчёт.</p>
          <Button variant="secondary" onClick={retry}>
            Повторить
          </Button>
        </>
      ) : state.status === 'loading' || state.value.month !== month ? (
        <p role="status">Загружаем отчёт…</p>
      ) : (
        <AnalyticsResults report={state.value} />
      )}
    </section>
  );
}
