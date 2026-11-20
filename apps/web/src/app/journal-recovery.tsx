import {
  restoreIntoEmptyJournal,
  validateBackupJson,
} from '@money-level/application';
import type { BackupData } from '@money-level/application';
import type { IndexedDbJournal } from '@money-level/storage-indexeddb';
import { sha256Checksum } from '@money-level/storage-indexeddb';
import { Button } from '@money-level/ui-kit';
import { useRef, useState } from 'react';

interface RecoveryJournal {
  name: string;
  storage: IndexedDbJournal;
}

export function JournalRecovery({
  waiting,
  retry,
  createJournal,
  selectJournal,
}: {
  waiting: boolean;
  retry: () => void;
  createJournal: () => RecoveryJournal;
  selectJournal: (journal: RecoveryJournal) => void;
}) {
  const [backup, setBackup] = useState<BackupData>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const active = useRef(false);

  async function inspect(file: File | undefined) {
    if (active.current) return;
    setError('');
    setBackup(undefined);
    if (!file) return;
    active.current = true;
    setBusy(true);
    try {
      const { data } = await validateBackupJson(
        await file.text(),
        sha256Checksum,
      );
      if (!data.settings?.onboardingCompleted) {
        setError('Копия должна содержать полностью настроенный профиль.');
        return;
      }
      setBackup(data);
    } catch {
      setError(
        'Файл не прошёл проверку формата, контрольной суммы или связей между записями.',
      );
    } finally {
      setBusy(false);
      active.current = false;
    }
  }

  async function restore() {
    if (!backup || active.current) return;
    active.current = true;
    setBusy(true);
    setError('');
    let recovered: RecoveryJournal | undefined;
    try {
      recovered = createJournal();
      await restoreIntoEmptyJournal(recovered.storage, backup);
      const profile = await recovered.storage.read(({ settings }) =>
        settings.get('profile'),
      );
      if (!profile?.onboardingCompleted)
        throw new Error('The recovered profile could not be opened.');
      selectJournal(recovered);
    } catch {
      recovered?.storage.close();
      setError(
        'Не удалось открыть восстановленный журнал. Проверьте свободное место и разрешение браузера на локальное хранение.',
      );
    } finally {
      setBusy(false);
      active.current = false;
    }
  }

  return (
    <main className="form-page">
      <h1>Восстановление журнала</h1>
      <p role={waiting ? 'status' : 'alert'}>
        {waiting
          ? 'Локальный журнал открывается дольше обычного.'
          : 'Не удалось открыть локальный журнал.'}
      </p>
      <p className="form-intro">
        Закройте другие вкладки Money Level, проверьте разрешение на локальное
        хранение и попробуйте снова.
      </p>
      <Button variant="secondary" onClick={retry} disabled={busy}>
        Повторить открытие
      </Button>
      <section className="form-card" aria-labelledby="recovery-backup">
        <h2 id="recovery-backup">Восстановить из JSON</h2>
        <p>
          Копия откроется в отдельном локальном журнале. Исходная база
          сохранится на устройстве.
        </p>
        <label className="form-field">
          Файл резервной копии
          <input
            type="file"
            accept=".json,application/json"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              void inspect(file);
            }}
          />
        </label>
        {busy && <p role="status">Проверяем копию и локальное хранилище…</p>}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {backup && (
          <>
            <p role="status">
              Копия проверена. Счетов {backup.accounts.length}, операций{' '}
              {backup.transactions.length}.
            </p>
            <Button busy={busy} onClick={() => void restore()}>
              Открыть отдельный журнал
            </Button>
          </>
        )}
      </section>
    </main>
  );
}
