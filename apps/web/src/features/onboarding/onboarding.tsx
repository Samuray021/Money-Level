import { finishOnboarding } from '@money-level/application';
import type { HumorFrequency, ProfileSettings } from '@money-level/contracts';
import { Button } from '@money-level/ui-kit';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useJournal } from '../../app/journal-context.js';
import { ProfileSetup } from './profile-setup.js';
import './setup.css';

function OpeningSetup({ profile }: { profile: ProfileSettings }) {
  const { commands, setProfile } = useJournal();
  const [amount, setAmount] = useState('0');
  const [frequency, setFrequency] = useState<HumorFrequency>('usual');
  const [profanity, setProfanity] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError('');
    setSaving(true);
    try {
      setProfile(
        await finishOnboarding(commands, {
          openingAmount: amount.trim(),
          humorFrequency: frequency,
          profanityEnabled: profanity,
        }),
      );
    } catch (cause) {
      setError(
        cause instanceof RangeError
          ? 'Проверьте сумму начального остатка.'
          : 'Не удалось сохранить настройки. Попробуйте ещё раз.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="form-page">
      <h1>Начальный остаток</h1>
      <p className="form-intro">Укажите, сколько уже есть на счёте.</p>
      <form className="form-card" onSubmit={submit}>
        <label className="form-field">
          Сумма ({profile.baseCurrency})
          <input
            inputMode="decimal"
            required
            maxLength={24}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        <label className="form-field">
          Частота шуток
          <select
            value={frequency}
            onChange={(event) => {
              const value = event.target.value;
              setFrequency(
                value === 'off' || value === 'rare' ? value : 'usual',
              );
            }}
          >
            <option value="off">Выключены</option>
            <option value="rare">Редко</option>
            <option value="usual">Обычно</option>
          </select>
        </label>
        <label className="form-checkbox">
          <input
            type="checkbox"
            checked={profanity && frequency !== 'off'}
            disabled={frequency === 'off'}
            onChange={(event) => setProfanity(event.target.checked)}
          />
          Разрешить мат в шутках
        </label>
        <p className="form-intro">Данные сохраняются на этом устройстве.</p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" busy={saving}>
          {saving ? 'Сохраняем…' : 'К учёту'}
        </Button>
      </form>
    </section>
  );
}

export function Onboarding() {
  const { profile } = useJournal();
  const [started, setStarted] = useState(false);
  if (profile) return <OpeningSetup profile={profile} />;
  if (started) return <ProfileSetup />;

  return (
    <section className="form-page">
      <h1>Личные финансы</h1>
      <p className="form-intro">
        Записывайте доходы и расходы и смотрите, сколько денег осталось на
        счетах.
      </p>
      <Button onClick={() => setStarted(true)}>Начать</Button>
    </section>
  );
}
