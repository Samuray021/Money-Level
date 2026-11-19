import type { ProfileSettings } from '@money-level/contracts';
import type { RoastCard } from '@money-level/meme-engine';
import { Button } from '@money-level/ui-kit';
import { useState } from 'react';
import { downloadFile } from '../../components/download-file.js';
import { createRoastPng, roastCardCaption } from './roast-png.js';

export function RoastCardExport({
  card,
  profile,
}: {
  card: RoastCard;
  profile: ProfileSettings;
}) {
  const [showFigures, setShowFigures] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const caption = roastCardCaption(
    card,
    profile.baseCurrency,
    showFigures && !profile.balanceHidden,
  );

  async function save() {
    if (pending) return;
    setPending(true);
    setError(false);
    try {
      downloadFile(await createRoastPng(card.text, caption), 'money-level.png');
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <details className="roast-export">
      <summary>Экспорт карточки</summary>
      <p>Предпросмотр PNG</p>
      <div className="roast-preview">
        <span>Money Level</span>
        <p>{card.text}</p>
        <span>{caption}</span>
      </div>
      {profile.balanceHidden ? (
        <p>Действует настройка «Скрыть суммы».</p>
      ) : (
        <label className="form-checkbox">
          <input
            type="checkbox"
            checked={showFigures}
            onChange={(event) => setShowFigures(event.target.checked)}
          />
          Показать показатели в PNG
        </label>
      )}
      <Button variant="secondary" disabled={pending} onClick={save}>
        Сохранить PNG
      </Button>
      {error && <p role="alert">Не удалось сохранить картинку.</p>}
    </details>
  );
}
