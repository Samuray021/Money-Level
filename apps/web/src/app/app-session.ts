import { uuidSchema } from '@money-level/contracts';

let active: { id: string; startedAt: number } | undefined;

export function appSession() {
  if (active) return active;
  active = { id: crypto.randomUUID(), startedAt: Date.now() };
  try {
    const raw = sessionStorage.getItem('money-level-meme-session');
    if (raw) {
      const stored = JSON.parse(raw) as Partial<typeof active>;
      if (
        typeof stored.id === 'string' &&
        uuidSchema.safeParse(stored.id).success &&
        typeof stored.startedAt === 'number' &&
        Number.isFinite(stored.startedAt) &&
        stored.startedAt <= active.startedAt
      ) {
        active = { id: stored.id, startedAt: stored.startedAt };
        return active;
      }
    }
    sessionStorage.setItem('money-level-meme-session', JSON.stringify(active));
  } catch {
    // Keep the same in-memory identity when sessionStorage is unavailable.
  }
  return active;
}
