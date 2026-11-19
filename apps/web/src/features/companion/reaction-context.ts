import type { MemeReaction } from '@money-level/meme-engine';
import { createContext, useContext } from 'react';

export const ReactionContext = createContext<MemeReaction | undefined>(
  undefined,
);

export function useReaction() {
  return useContext(ReactionContext);
}
