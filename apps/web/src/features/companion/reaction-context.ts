import type { DeliveredReaction } from '@money-level/application';
import { createContext, useContext } from 'react';

export const ReactionContext = createContext<DeliveredReaction | undefined>(
  undefined,
);

export function useReaction() {
  return useContext(ReactionContext);
}
