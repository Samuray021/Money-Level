import { setBalanceHidden } from '@money-level/application';
import { Button } from '@money-level/ui-kit';
import { useState } from 'react';
import { useJournal } from '../app/journal-context.js';

export function PrivacyToggle() {
  const { commands, profile, setProfile } = useJournal();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  if (!profile?.onboardingCompleted) return null;

  const hidden = profile.balanceHidden;
  async function toggle() {
    if (saving) return;
    setError(false);
    setSaving(true);
    try {
      setProfile(await setBalanceHidden(commands.storage, !hidden));
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="privacy-control">
      <Button
        variant="secondary"
        className="privacy-toggle"
        aria-pressed={hidden}
        busy={saving}
        onClick={toggle}
      >
        Скрыть суммы
      </Button>
      {error && (
        <span className="privacy-error" role="alert">
          Настройка не сохранена
        </span>
      )}
    </div>
  );
}
