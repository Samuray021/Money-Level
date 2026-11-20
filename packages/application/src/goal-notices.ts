import { consumeOutbox } from './outbox.js';
import type { JournalCommandContext } from './create-transaction.js';

export async function claimGoalCompletionNotices(
  context: JournalCommandContext,
  since: number,
): Promise<number> {
  const pending = await consumeOutbox(context.storage, {
    consumer: 'goal-notice',
    ...(context.clock ? { clock: context.clock } : {}),
    filter: (event) =>
      event.type === 'goal.completed' && Date.parse(event.occurredAt) >= since,
    async handle(event, journal) {
      const goal = await journal.goals.get(event.sourceEntityId);
      return goal?.status === 'completed' && !goal.deletedAt;
    },
  });
  return pending.filter(Boolean).length;
}
