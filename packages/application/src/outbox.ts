import type { DomainEvent } from '@money-level/contracts';
import type { UnitOfWork } from './journal-repository.js';

function chronological(left: DomainEvent, right: DomainEvent): number {
  return (
    Date.parse(left.occurredAt) - Date.parse(right.occurredAt) ||
    left.eventId.localeCompare(right.eventId)
  );
}

export async function consumeOutbox(
  storage: UnitOfWork,
  handle: (event: DomainEvent) => Promise<void> | void,
): Promise<void> {
  const events = await storage.read((journal) => journal.outbox.list());
  for (const event of events.sort(chronological)) await handle(event);
}
