import { initializeProfile } from '@money-level/application';
import { Button } from '@money-level/ui-kit';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useJournal } from '../../app/journal-context.js';
import './setup.css';

const names = new Intl.DisplayNames('ru-RU', { type: 'currency' });
const currencies = [
  'RUB',
  ...Intl.supportedValuesOf('currency').filter((code) => code !== 'RUB'),
];

export function ProfileSetup() {
  const { commands, profile, setProfile } = useJournal();
  const [currency, setCurrency] = useState('RUB');
  const [name, setName] = useState('Основной');
  const [kind, setKind] = useState<'card' | 'cash'>('card');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError('');
    setSaving(true);
    try {
      const settings = await initializeProfile(commands, {
        currency,
        name,
        kind,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setProfile(settings);
    } catch {
      setError(
        'Не удалось сохранить счёт. Проверьте название и попробуйте ещё раз.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (profile) {
    return (
      <section className="form-page">
        <h1>Первый счёт сохранён</h1>
      </section>
    );
  }

  return (
    <section className="form-page">
      <h1>Первый счёт</h1>
      <p className="form-intro">
        Выберите валюту для всех счетов и добавьте счёт, с которого начнёте
        учёт.
      </p>
      <form className="form-card" onSubmit={submit}>
        <label className="form-field">
          Валюта
          <select
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
          >
            {currencies.map((code) => (
              <option key={code} value={code}>
                {code} · {names.of(code)}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          Название счёта
          <input
            required
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="form-field">
          Тип счёта
          <select
            value={kind}
            onChange={(event) =>
              setKind(event.target.value === 'cash' ? 'cash' : 'card')
            }
          >
            <option value="card">Карта</option>
            <option value="cash">Наличные</option>
          </select>
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" busy={saving}>
          {saving ? 'Сохраняем…' : 'Далее'}
        </Button>
      </form>
    </section>
  );
}
