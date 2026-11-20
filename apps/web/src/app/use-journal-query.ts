import { observeJournal } from '@money-level/storage-indexeddb';
import { useEffect, useState } from 'react';

type QueryState<Value> =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; value: Value };

export function useJournalQuery<Value>(read: () => Promise<Value>) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<QueryState<Value>>({ status: 'loading' });

  useEffect(() => {
    const subscription = observeJournal(read).subscribe({
      next: (value) => setState({ status: 'ready', value }),
      error: () => setState({ status: 'error' }),
    });
    return () => subscription.unsubscribe();
  }, [read, attempt]);

  function retry() {
    setState({ status: 'loading' });
    setAttempt((value) => value + 1);
  }

  return { state, retry };
}
