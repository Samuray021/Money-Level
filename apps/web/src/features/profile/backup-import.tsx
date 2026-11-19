import {
  mergeBackup,
  replaceBackup,
  validateBackupJson,
} from '@money-level/application';
import type { BackupFile } from '@money-level/application';
import { sha256Checksum } from '@money-level/storage-indexeddb';
import { Button } from '@money-level/ui-kit';
import { useRef, useState } from 'react';
import { useJournal } from '../../app/journal-context.js';

const formatDate = new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function BackupImport({ restoreOnly }: { restoreOnly: boolean }) {
  const { commands, profile } = useJournal();
  const hasSetupDraft = restoreOnly && Boolean(profile);
  const input = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<{
    text: string;
    backup: BackupFile;
  }>();
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  async function inspect(file: File | undefined) {
    setSelected(undefined);
    setConfirmed(false);
    setMode('merge');
    setError('');
    setStatus('');
    if (!file || busy) return;
    setBusy(true);
    try {
      const text = await file.text();
      const backup = await validateBackupJson(text, sha256Checksum);
      if (restoreOnly && !backup.data.settings?.onboardingCompleted) {
        setError('В копии нет завершённых настроек профиля.');
        return;
      }
      setSelected({ text, backup });
    } catch {
      setError(
        'Файл не прошёл проверку формата, контрольной суммы или связей между записями. Журнал сохранён.',
      );
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  async function restore() {
    if (!selected || busy || (mode === 'replace' && !confirmed)) return;
    setBusy(true);
    setError('');
    setStatus('');
    try {
      if (hasSetupDraft) {
        await replaceBackup(commands, selected.text, sha256Checksum, true);
      } else if (mode === 'replace') {
        await replaceBackup(commands, selected.text, sha256Checksum, confirmed);
        setStatus('Журнал заменён. Предыдущий снимок можно скачать.');
      } else {
        const result = await mergeBackup(
          commands.storage,
          selected.text,
          sha256Checksum,
        );
        setStatus(
          `Импорт завершён. Добавлено счетов — ${result.accounts}, операций — ${result.transactions}.`,
        );
      }
      setSelected(undefined);
    } catch {
      setError('Не удалось применить копию. Журнал сохранён.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="management-row" aria-labelledby="backup-import-title">
      <h2 id="backup-import-title">Импорт из JSON</h2>
      <label className="form-field">
        Файл резервной копии
        <input
          ref={input}
          type="file"
          accept=".json,application/json"
          disabled={busy}
          onChange={(event) => void inspect(event.target.files?.[0])}
        />
      </label>
      {selected && (
        <>
          <dl className="backup-details">
            <div>
              <dt>Дата создания</dt>
              <dd>{formatDate.format(new Date(selected.backup.createdAt))}</dd>
            </div>
            <div>
              <dt>Счета</dt>
              <dd>{selected.backup.data.accounts.length}</dd>
            </div>
            <div>
              <dt>Операции</dt>
              <dd>{selected.backup.data.transactions.length}</dd>
            </div>
          </dl>
          {hasSetupDraft && (
            <p>Восстановление заменит незавершённые настройки профиля.</p>
          )}
          {!restoreOnly && (
            <fieldset className="backup-modes" disabled={busy}>
              <legend>Что сделать с текущим журналом</legend>
              <label className="form-checkbox">
                <input
                  type="radio"
                  name="backup-mode"
                  checked={mode === 'merge'}
                  onChange={() => {
                    setMode('merge');
                    setConfirmed(false);
                  }}
                />
                Объединить с текущим журналом
              </label>
              <label className="form-checkbox">
                <input
                  type="radio"
                  name="backup-mode"
                  checked={mode === 'replace'}
                  onChange={() => setMode('replace')}
                />
                Заменить текущий журнал
              </label>
              {mode === 'replace' && (
                <>
                  <p>
                    Операции и настройки заменятся данными из файла. Перед
                    заменой приложение сохранит снимок на этом устройстве.
                  </p>
                  <label className="form-checkbox">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(event) => setConfirmed(event.target.checked)}
                    />
                    Подтверждаю замену журнала
                  </label>
                </>
              )}
            </fieldset>
          )}
          <Button
            busy={busy}
            disabled={mode === 'replace' && !confirmed}
            onClick={() => void restore()}
          >
            {restoreOnly ? 'Восстановить журнал' : 'Импортировать копию'}
          </Button>
        </>
      )}
      {busy && !selected && <p role="status">Проверяем файл…</p>}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {status && <p role="status">{status}</p>}
    </section>
  );
}
