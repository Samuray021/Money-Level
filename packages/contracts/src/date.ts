import { isoDateSchema } from './primitives.js';

export function localTransactionDate(instant: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    calendar: 'iso8601',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(instant).map(({ type, value }) => [type, value]),
  );
  return isoDateSchema.parse(
    [parts.year?.padStart(4, '0'), parts.month, parts.day].join('-'),
  );
}
