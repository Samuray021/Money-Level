import type { ProfileSettings } from '@money-level/contracts';
import type { RoastCard } from '@money-level/meme-engine';
import { Button } from '@money-level/ui-kit';
import { useEffect, useState } from 'react';
import { downloadFile } from '../../components/download-file.js';
import { createRoastPng, roastCardCaption } from './roast-png.js';

const filename = 'money-level.png';
type PreparedCard =
  | { caption: string; title: string; file: File }
  | { caption: string; title: string; failed: true };

export function RoastCardExport({
  card,
  profile,
}: {
  card: RoastCard;
  profile: ProfileSettings;
}) {
  const [open, setOpen] = useState(false);
  const [showFigures, setShowFigures] = useState(false);
  const [prepared, setPrepared] = useState<PreparedCard>();
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState(false);
  const caption = roastCardCaption(
    card,
    profile.baseCurrency,
    showFigures && !profile.balanceHidden,
  );
  const title = card.text;
  const current =
    open && prepared?.caption === caption && prepared.title === title
      ? prepared
      : undefined;
  const file = current && 'file' in current ? current.file : undefined;

  useEffect(() => {
    if (!open) return;
    let active = true;
    void createRoastPng(title, caption).then(
      (blob) => {
        if (!active) return;
        const file = new File([blob], filename, { type: 'image/png' });
        setPrepared({ caption, title, file });
      },
      () => {
        if (active) setPrepared({ caption, title, failed: true });
      },
    );
    return () => {
      active = false;
    };
  }, [title, caption, open]);

  function save() {
    if (file) downloadFile(file, filename);
  }

  async function share() {
    if (!file || sharing) return;
    setError(false);
    setSharing(true);
    try {
      const data = { files: [file], title: 'Money Level' };
      if (typeof navigator.share === 'function' && navigator.canShare?.(data))
        await navigator.share(data);
      else save();
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === 'AbortError'))
        setError(true);
    } finally {
      setSharing(false);
    }
  }

  return (
    <details
      className="roast-export"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
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
      <div className="analytics-links">
        <Button variant="secondary" disabled={!file} onClick={save}>
          Сохранить PNG
        </Button>
        <Button
          variant="secondary"
          disabled={!file}
          busy={sharing}
          onClick={share}
        >
          Поделиться PNG
        </Button>
      </div>
      {current && 'failed' in current && (
        <p role="alert">Не удалось создать картинку.</p>
      )}
      {error && <p role="alert">Не удалось поделиться. Можно сохранить PNG.</p>}
    </details>
  );
}
