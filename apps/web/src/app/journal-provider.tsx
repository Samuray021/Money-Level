import type { ProfileSettings } from '@money-level/contracts';
import {
  IndexedDbJournal,
  observeJournal,
} from '@money-level/storage-indexeddb';
import { Button } from '@money-level/ui-kit';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { JournalContext } from './journal-context.js';

type ProfileState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; profile: ProfileSettings | undefined };

const commands = {
  storage: new IndexedDbJournal(),
  createId: () => crypto.randomUUID(),
};

export function JournalProvider({ children }: { children: ReactNode }) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ProfileState>({ status: 'loading' });

  useEffect(() => {
    const subscription = observeJournal(() =>
      commands.storage.read((journal) => journal.settings.get('profile')),
    ).subscribe({
      next: (profile) => setState({ status: 'ready', profile }),
      error: () => setState({ status: 'error' }),
    });
    return () => subscription.unsubscribe();
  }, [attempt]);

  if (state.status === 'loading') {
    return (
      <main className="form-page">
        <p role="status">Открываем локальный журнал…</p>
      </main>
    );
  }
  if (state.status === 'error') {
    return (
      <main className="form-page">
        <p role="alert">Не удалось открыть локальный журнал.</p>
        <Button
          onClick={() => {
            setState({ status: 'loading' });
            setAttempt((value) => value + 1);
          }}
        >
          Повторить
        </Button>
      </main>
    );
  }

  const value = {
    commands,
    profile: state.profile,
    setProfile: (profile: ProfileSettings) =>
      setState({ status: 'ready', profile }),
  };
  return (
    <JournalContext.Provider value={value}>{children}</JournalContext.Provider>
  );
}
