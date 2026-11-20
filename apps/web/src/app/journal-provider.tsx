import { uuidSchema } from '@money-level/contracts';
import type { ProfileSettings } from '@money-level/contracts';
import {
  IndexedDbJournal,
  observeJournal,
} from '@money-level/storage-indexeddb';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { JournalContext } from './journal-context.js';
const JournalRecovery = lazy(() =>
  import('./journal-recovery.js').then(({ JournalRecovery }) => ({
    default: JournalRecovery,
  })),
);

type ProfileState =
  | { status: 'loading' | 'waiting' | 'error' }
  | { status: 'ready'; profile: ProfileSettings | undefined };

const activeJournalKey = 'money-level-active-journal';
const recoveredPrefix = 'money-level-recovered-';

function activeJournal() {
  try {
    const stored = localStorage.getItem(activeJournalKey);
    if (
      stored?.startsWith(recoveredPrefix) &&
      uuidSchema.safeParse(stored.slice(recoveredPrefix.length)).success
    )
      return stored;
  } catch {
    // Browsers can restrict access to localStorage independently of IndexedDB.
  }
  return 'money-level';
}

function connection(name: string) {
  return { name, storage: new IndexedDbJournal(name) };
}

export function JournalProvider({ children }: { children: ReactNode }) {
  const [journal, setJournal] = useState(() => connection(activeJournal()));
  const [state, setState] = useState<ProfileState>({ status: 'loading' });
  const commands = useMemo(
    () => ({
      storage: journal.storage,
      createId: () => crypto.randomUUID(),
    }),
    [journal.storage],
  );

  useEffect(() => {
    const waiting = window.setTimeout(
      () => setState({ status: 'waiting' }),
      5000,
    );
    const stopWaiting = () => window.clearTimeout(waiting);
    const subscription = observeJournal(() =>
      commands.storage.read((journal) => journal.settings.get('profile')),
    ).subscribe({
      next: (profile) => {
        stopWaiting();
        setState({ status: 'ready', profile });
      },
      error: () => {
        stopWaiting();
        setState({ status: 'error' });
      },
    });
    return () => {
      stopWaiting();
      subscription.unsubscribe();
    };
  }, [commands.storage]);

  function retry() {
    journal.storage.close();
    setState({ status: 'loading' });
    setJournal(connection(journal.name));
  }

  function selectRecoveredJournal(recovered: ReturnType<typeof connection>) {
    localStorage.setItem(activeJournalKey, recovered.name);
    journal.storage.close();
    setState({ status: 'loading' });
    setJournal(recovered);
  }

  if (state.status === 'loading') {
    return (
      <main className="form-page">
        <p role="status">Открываем локальный журнал…</p>
      </main>
    );
  }
  if (state.status !== 'ready') {
    return (
      <Suspense
        fallback={
          <main className="form-page">
            <p role="status">Готовим восстановление…</p>
          </main>
        }
      >
        <JournalRecovery
          waiting={state.status === 'waiting'}
          retry={retry}
          createJournal={() =>
            connection(recoveredPrefix + commands.createId())
          }
          selectJournal={selectRecoveredJournal}
        />
      </Suspense>
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
