import { describe, expect, test, vi } from 'vitest';
import { createSeededRandom, systemClock } from './index.js';

describe('runtime sources', () => {
  test('replays a seeded sequence and samples inside [0, 1)', () => {
    const sample = (seed: number) => {
      const random = createSeededRandom(seed);
      return Array.from({ length: 32 }, () => random.next());
    };
    const values = sample(0);

    expect(values).toEqual(sample(0));
    expect(values).not.toEqual(sample(1));
    expect(new Set(values).size).toBeGreaterThan(1);
    expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
    expect(() => createSeededRandom(2 ** 32)).toThrow(RangeError);
  });

  test('reads the current instant from the clock', () => {
    vi.useFakeTimers();
    try {
      const instant = new Date('2026-11-19T09:15:00.000Z');
      vi.setSystemTime(instant);
      expect(systemClock.now()).toEqual(instant);
      vi.advanceTimersByTime(500);
      expect(systemClock.now().getTime()).toBe(instant.getTime() + 500);
    } finally {
      vi.useRealTimers();
    }
  });
});
