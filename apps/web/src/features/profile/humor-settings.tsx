import { saveHumorSettings } from '@money-level/application';
import type { HumorSettings } from '@money-level/application';
import { Button } from '@money-level/ui-kit';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useJournal } from '../../app/journal-context.js';

function HumorForm({ defaults }: { defaults: HumorSettings }) {
  const { commands, setProfile } = useJournal();
  const [settings, setSettings] = useState(defaults);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'saved' | 'error'>();
  function field<Key extends keyof HumorSettings>(
    key: Key,
    value: HumorSettings[Key],
  ) {
    setStatus(undefined);
    setSettings((current) => ({ ...current, [key]: value }));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      setProfile(await saveHumorSettings(commands.storage, settings));
      setStatus('saved');
    } catch {
      setStatus('error');
    } finally {
      setSaving(false);
    }
  }
  return (
    <form className="form-card" onSubmit={submit}>
      <label className="form-checkbox">
        <input
          type="checkbox"
          checked={settings.companionEnabled}
          onChange={(event) => field('companionEnabled', event.target.checked)}
        />{' '}
        Показывать компаньона
      </label>
      <label className="form-field">
        Режим юмора
        <select
          value={settings.humorMode}
          onChange={(event) =>
            field('humorMode', event.target.value as HumorSettings['humorMode'])
          }
        >
          <option value="off">Выключен</option>
          <option value="neutral">Нейтральный</option>
          <option value="roast">Дерзкий</option>
          <option value="chaos">Хаос</option>
        </select>
      </label>
      <label className="form-field">
        Частота реакций
        <select
          value={settings.humorFrequency}
          onChange={(event) =>
            field(
              'humorFrequency',
              event.target.value as HumorSettings['humorFrequency'],
            )
          }
        >
          <option value="off">Выключены</option>
          <option value="rare">Редко</option>
          <option value="usual">Обычно</option>
        </select>
      </label>
      <label className="form-checkbox">
        <input
          type="checkbox"
          checked={settings.profanityEnabled}
          onChange={(event) => field('profanityEnabled', event.target.checked)}
        />{' '}
        Разрешить мат в шутках
      </label>
      <label className="form-checkbox">
        <input
          type="checkbox"
          checked={settings.quietMode}
          onChange={(event) => field('quietMode', event.target.checked)}
        />{' '}
        Тихий режим без всплывающих реакций
      </label>
      <label className="form-checkbox">
        <input
          type="checkbox"
          checked={settings.motionEnabled}
          onChange={(event) => field('motionEnabled', event.target.checked)}
        />{' '}
        Анимации
      </label>
      <label className="form-checkbox">
        <input
          type="checkbox"
          checked={settings.soundsEnabled}
          onChange={(event) => field('soundsEnabled', event.target.checked)}
        />{' '}
        Звуки реакций
      </label>
      {status === 'saved' && <p role="status">Настройки сохранены.</p>}
      {status === 'error' && (
        <p className="form-error" role="alert">
          Не удалось сохранить настройки.
        </p>
      )}
      <Button type="submit" busy={saving}>
        Сохранить настройки
      </Button>
    </form>
  );
}

export function HumorPreferences() {
  const { profile } = useJournal();
  return (
    <section className="form-page">
      <Link to="/profile">К профилю</Link>
      <h1>Компаньон и юмор</h1>
      {profile && <HumorForm defaults={profile} />}
    </section>
  );
}
