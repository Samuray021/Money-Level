import {
  deleteTransaction,
  undoDeleteTransaction,
  undoDeleteWindowMs,
} from '@money-level/application';
import { Button } from '@money-level/ui-kit';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useJournal } from '../../app/journal-context.js';
import type { HistoryNavigationState } from './history-filters.js';

export interface Deletion {
  id: string;
  deletedAt: string;
}

export function EntryActions({ id }: { id: string }) {
  const { commands, profile } = useJournal();
  const location = useLocation();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const inFlight = useRef(false);

  async function remove() {
    if (!profile || inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    setError(false);
    try {
      await deleteTransaction(
        { ...commands, baseCurrency: profile.baseCurrency },
        id,
      );
      const entry = await commands.storage.read((journal) =>
        journal.transactions.get(id),
      );
      const previous = location.state as HistoryNavigationState;
      const undo = entry?.deletedAt
        ? { id, deletedAt: entry.deletedAt }
        : undefined;
      void navigate('/history', {
        replace: true,
        state: {
          historyFilters: previous?.historyFilters,
          historyPage: previous?.historyPage,
          undo,
        },
      });
    } catch {
      setError(true);
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  return confirm ? (
    <section className="history-confirm" aria-label="Подтверждение удаления">
      <p>Удалить операцию?</p>
      {error && (
        <p role="alert" className="form-error">
          Не удалось удалить операцию.
        </p>
      )}
      <div className="history-actions">
        <Button
          variant="secondary"
          disabled={saving}
          onClick={() => setConfirm(false)}
        >
          Отмена
        </Button>
        <Button
          className="history-delete"
          variant="secondary"
          busy={saving}
          onClick={() => {
            void remove();
          }}
        >
          Подтвердить удаление
        </Button>
      </div>
    </section>
  ) : (
    <div className="history-actions">
      <Link
        className="ml-button ml-button--secondary"
        to={'/history/' + id + '/edit'}
        state={location.state}
      >
        Изменить
      </Link>
      <Button
        className="history-delete"
        variant="secondary"
        onClick={() => setConfirm(true)}
      >
        Удалить
      </Button>
    </div>
  );
}

export function UndoDeletion({ deletion }: { deletion: Deletion }) {
  const { commands, profile } = useJournal();
  const [visible, setVisible] = useState(
    () => Date.now() < Date.parse(deletion.deletedAt) + undoDeleteWindowMs,
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('Операция удалена.');
  const inFlight = useRef(false);

  useEffect(() => {
    const remaining =
      Date.parse(deletion.deletedAt) + undoDeleteWindowMs - Date.now();
    const timer = window.setTimeout(
      () => setVisible(false),
      Math.max(0, remaining),
    );
    return () => window.clearTimeout(timer);
  }, [deletion.deletedAt]);

  async function undo() {
    if (!profile || inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    try {
      const restored = await undoDeleteTransaction(
        { ...commands, baseCurrency: profile.baseCurrency },
        deletion.id,
        deletion.deletedAt,
      );
      setVisible(false);
      setMessage(
        restored ? 'Операция восстановлена.' : 'Время для отмены истекло.',
      );
    } catch {
      setMessage('Не удалось восстановить операцию.');
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }
  if (!visible && message === 'Операция удалена.') return null;

  return (
    <div className="history-undo">
      <p role="status">{message}</p>
      {visible && (
        <Button
          variant="secondary"
          busy={saving}
          onClick={() => {
            void undo();
          }}
        >
          Отменить удаление
        </Button>
      )}
    </div>
  );
}
