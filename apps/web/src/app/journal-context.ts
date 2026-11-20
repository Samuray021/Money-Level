import type { JournalCommandContext } from '@money-level/application';
import type { ProfileSettings } from '@money-level/contracts';
import { createContext, useContext } from 'react';

export interface JournalContextValue {
  commands: JournalCommandContext;
  profile: ProfileSettings | undefined;
  setProfile: (profile: ProfileSettings) => void;
}

export const JournalContext = createContext<JournalContextValue | null>(null);

export function useJournal(): JournalContextValue {
  const context = useContext(JournalContext);
  if (!context) throw new Error('Money Level journal provider is missing.');
  return context;
}
