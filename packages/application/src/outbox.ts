import { eventReceiptSchema, systemClock } from '@money-level/contracts';
import type { Clock, DomainEvent } from '@money-level/contracts';
import type { JournalWriter, UnitOfWork } from './journal-repository.js';

function chronological(left: DomainEvent, right: DomainEvent): number {
  return (
    Date.parse(left.occurredAt) - Date.parse(right.occurredAt) ||
    left.eventId.localeCompare(right.eventId)
  );
}

export async function consumeOutbox<Result>(
  storage: UnitOfWork,
  options: {
    consumer: string;
    clock?: Clock;
    filter?: (event: DomainEvent) => boolean;
    handle: (
      event: DomainEvent,
      journal: JournalWriter,
    ) => Promise<Result> | Result;
  },
): Promise<Result[]> {
  const pending = await storage.read(async (journal) => {
    const receipts = await journal.eventReceipts.list();
    const seen = new Set(
      receipts
        .filter(({ consumer }) => consumer === options.consumer)
        .map(({ eventId }) => eventId),
    );
    return (await journal.outbox.list())
      .filter(
        (event) =>
          !seen.has(event.eventId) && (options.filter?.(event) ?? true),
      )
      .sort(chronological);
  });

  const results: Result[] = [];
  for (const event of pending) {
    const id = options.consumer + ':' + event.eventId;
    const outcome = await storage.write(async (journal) => {
      if (await journal.eventReceipts.get(id)) return null;
      const current = await journal.outbox.get(event.eventId);
      if (!current || (options.filter && !options.filter(current))) return null;
      const receipt = eventReceiptSchema.parse({
        id,
        eventId: event.eventId,
        consumer: options.consumer,
        processedAt: (options.clock ?? systemClock).now().toISOString(),
      });
      const result = await options.handle(current, journal);
      await journal.eventReceipts.put(receipt);
      return { result };
    });
    if (outcome) results.push(outcome.result);
  }
  return results;
}
