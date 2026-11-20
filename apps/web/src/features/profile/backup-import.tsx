import {
  BackupMergePreviewChanged,
  mergeBackup,
  previewBackupMerge,
  replaceBackup,
  validateBackupJson,
} from '@money-level/application';
import type { BackupFile, BackupMergePreview } from '@money-level/application';
import { sha256Checksum } from '@money-level/storage-indexeddb';
import { Button } from '@money-level/ui-kit';
import { useCallback, useRef, useState } from 'react';
import { useJournal } from '../../app/journal-context.js';
import { useJournalQuery } from '../../app/use-journal-query.js';
import { MoneyAmount } from '../../components/money-amount.js';

const formatDate = new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function MergeDetails({
  preview,
  showAmounts,
}: {
  preview: BackupMergePreview;
  showAmounts: boolean;
}) {
  const { totals, projection, tables } = preview;
  return (
    <section aria-label="Предпросмотр объединения">
      <h3>Предпросмотр объединения</h3>
      <dl className="backup-details">
        <div>
          <dt>Записей в копии</dt>
          <dd>{totals.incoming}</dd>
        </div>
        <div>
          <dt>Новых записей</dt>
          <dd>{totals.added}</dd>
        </div>
        <div>
          <dt>Дубликатов</dt>
          <dd>{totals.duplicates}</dd>
        </div>
        <div>
          <dt>Конфликтов</dt>
          <dd>{totals.conflicts}</dd>
        </div>
      </dl>
      {projection ? (
        <>
          <p>
            Будут добавлены счета ({tables.accounts?.added}), операции (
            {tables.transactions?.added}) и цели ({tables.goals?.added}).
          </p>
          {totals.conflicts > 0 && (
            <p>
              При совпадении идентификаторов сохраняются текущие записи журнала.
            </p>
          )}
          {showAmounts && (
            <dl className="backup-details">
              <div>
                <dt>Баланс после объединения</dt>
                <dd>
                  <MoneyAmount amount={projection.after.totalMinor} />
                </dd>
              </div>
              <div>
                <dt>Доступно после объединения</dt>
                <dd>
                  <MoneyAmount amount={projection.after.availableMinor} />
                </dd>
              </div>
              <div>
                <dt>В резервах после объединения</dt>
                <dd>
                  <MoneyAmount amount={projection.after.reservedMinor} />
                </dd>
              </div>
            </dl>
          )}
        </>
      ) : (
        <p className="form-error" role="alert">
          Объединение нарушит ограничения журнала. Проверьте валюту, ссылки,
          названия категорий и бюджеты.
        </p>
      )}
    </section>
  );
}

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
  const shouldMerge = Boolean(selected) && mode === 'merge' && !hasSetupDraft;
  const copy = shouldMerge ? selected?.backup : undefined;
  const readPreview = useCallback(async () => {
    if (!copy) return undefined;
    return {
      checksum: copy.checksum,
      data: await previewBackupMerge(commands.storage, copy.data),
    };
  }, [commands.storage, copy]);
  const { state: previewState, retry: retryPreview } =
    useJournalQuery(readPreview);
  const preview =
    previewState.status === 'ready' &&
    previewState.value?.checksum === copy?.checksum
      ? previewState.value?.data
      : undefined;

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
    if (
      !selected ||
      busy ||
      (mode === 'replace' && !confirmed) ||
      (shouldMerge && !preview?.projection)
    )
      return;
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
          preview,
        );
        setStatus(
          `Импорт завершён. Добавлено счетов — ${result.accounts}, операций — ${result.transactions}.`,
        );
      }
      setSelected(undefined);
    } catch (cause) {
      if (cause instanceof BackupMergePreviewChanged) {
        setError(
          'Журнал изменился. Проверьте новый прогноз и подтвердите импорт повторно.',
        );
        retryPreview();
      } else {
        setError('Не удалось применить копию. Журнал сохранён.');
      }
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
          {shouldMerge &&
            (preview ? (
              <MergeDetails
                preview={preview}
                showAmounts={profile?.onboardingCompleted === true}
              />
            ) : previewState.status === 'error' ? (
              <>
                <p role="alert">Не удалось подготовить предпросмотр.</p>
                <Button variant="secondary" onClick={retryPreview}>
                  Повторить расчёт
                </Button>
              </>
            ) : (
              <p role="status">Рассчитываем изменения…</p>
            ))}
          <Button
            busy={busy}
            disabled={
              (mode === 'replace' && !confirmed) ||
              (shouldMerge && !preview?.projection)
            }
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
