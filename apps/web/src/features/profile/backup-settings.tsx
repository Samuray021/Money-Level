import {
  exportBackup,
  exportLatestRecoveryBackup,
  exportTransactionsCsv,
  noteManualBackup,
  wipeLocalJournal,
} from '@money-level/application';
import { sha256Checksum } from '@money-level/storage-indexeddb';
import { Button } from '@money-level/ui-kit';
import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useJournal } from '../../app/journal-context.js';
import { useJournalQuery } from '../../app/use-journal-query.js';
import { downloadFile } from '../../components/download-file.js';
import { BackupImport } from './backup-import.js';
import './management.css';

function BackupDownloads() {
  const { commands } = useJournal();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const read = useCallback(
    () =>
      commands.storage.read(async (journal) =>
        Boolean((await journal.recoverySnapshots.list()).length),
      ),
    [commands.storage],
  );
  const { state } = useJournalQuery(read);

  async function save(kind: 'json' | 'csv' | 'snapshot') {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (kind === 'csv') {
        const csv = await exportTransactionsCsv(commands.storage);
        downloadFile(
          new Blob([csv], { type: 'text/csv;charset=utf-8' }),
          'money-level-operations.csv',
        );
        return;
      }
      const file =
        kind === 'snapshot'
          ? await exportLatestRecoveryBackup(commands.storage, sha256Checksum)
          : await exportBackup(
              commands.storage,
              sha256Checksum,
              commands.clock,
            );
      if (!file) {
        setError('Снимок до замены недоступен.');
        return;
      }
      downloadFile(
        new Blob([JSON.stringify(file)], { type: 'application/json' }),
        kind === 'snapshot'
          ? 'money-level-before-replace.json'
          : 'money-level-backup.json',
      );
      if (kind === 'json') {
        try {
          await noteManualBackup(commands);
        } catch {
          setError('Файл подготовлен. Не удалось учесть достижение за копию.');
        }
      }
    } catch {
      setError('Не удалось подготовить файл. Попробуйте ещё раз.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="management-row" aria-labelledby="backup-download-title">
      <h2 id="backup-download-title">Скачать данные</h2>
      <p>
        JSON и CSV содержат реальные суммы и заметки, даже когда суммы скрыты в
        приложении. Храните файлы в безопасном месте. При очистке данных
        браузера копия JSON поможет восстановить журнал.
      </p>
      <div className="management-actions">
        <Button disabled={busy} onClick={() => void save('json')}>
          Скачать JSON
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => void save('csv')}
        >
          Скачать CSV
        </Button>
        {state.status === 'ready' && state.value && (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => void save('snapshot')}
          >
            Скачать снимок до замены
          </Button>
        )}
      </div>
      {busy && <p role="status">Готовим файл…</p>}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </section>
  );
}

function EraseJournal() {
  const { commands } = useJournal();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function erase() {
    if (!confirming || busy) return;
    setBusy(true);
    setError(false);
    try {
      await wipeLocalJournal(commands.storage, confirming);
      void navigate('/setup', { replace: true });
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <section className="management-row" aria-labelledby="erase-title">
      <h2 id="erase-title">Удаление локальных данных</h2>
      {confirming ? (
        <>
          <p>
            Будут удалены операции, настройки, достижения и сохранённые на
            устройстве снимки. Восстановить журнал можно только из заранее
            скачанного файла JSON.
          </p>
          <div className="management-actions">
            <Button
              className="backup-destructive"
              busy={busy}
              onClick={() => void erase()}
            >
              Подтвердить удаление всех данных
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              Отмена
            </Button>
          </div>
          {error && (
            <p role="alert" className="form-error">
              Не удалось удалить журнал.
            </p>
          )}
        </>
      ) : (
        <Button
          variant="secondary"
          className="backup-destructive"
          onClick={() => setConfirming(true)}
        >
          Стереть все данные
        </Button>
      )}
    </section>
  );
}

export function BackupSettings({
  restoreOnly = false,
}: {
  restoreOnly?: boolean;
}) {
  return (
    <section className="management">
      <Link to={restoreOnly ? '/setup' : '/profile'}>
        {restoreOnly ? 'К началу настройки' : 'К профилю'}
      </Link>
      <h1>
        {restoreOnly ? 'Восстановление журнала' : 'Резервные копии и данные'}
      </h1>
      {!restoreOnly && <BackupDownloads />}
      <BackupImport restoreOnly={restoreOnly} />
      {!restoreOnly && <EraseJournal />}
    </section>
  );
}
