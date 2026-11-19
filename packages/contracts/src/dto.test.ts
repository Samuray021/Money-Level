import { describe, expect, test } from 'vitest';
import {
  accountKindSchema,
  categoryTypeSchema,
  currencyCodeSchema,
  isoDateSchema,
  isoDateTimeSchema,
  minorUnitsSchema,
  transactionKindSchema,
  uuidSchema,
} from './index.js';

describe('serialized finance values', () => {
  test('validates UUID v4 and actual calendar dates', () => {
    expect(
      uuidSchema.safeParse('c0a19a94-cbd4-45da-a30d-0a4dfd25f779').success,
    ).toBe(true);
    expect(
      uuidSchema.safeParse('c0a19a94-cbd4-35da-a30d-0a4dfd25f779').success,
    ).toBe(false);
    expect(isoDateSchema.safeParse('2024-02-29').success).toBe(true);

    for (const date of [
      '2026-02-29',
      '2026-11-31',
      '2026-1-01',
      '2026-13-01',
    ]) {
      expect(isoDateSchema.safeParse(date).success).toBe(false);
    }
  });

  test('requires UTC timestamps', () => {
    expect(
      isoDateTimeSchema.safeParse('2026-11-01T00:00:00.000Z').success,
    ).toBe(true);
    expect(
      isoDateTimeSchema.safeParse('2026-11-01T03:00:00+03:00').success,
    ).toBe(false);
  });

  test('stores minor units as integer strings and accepts signed adjustments', () => {
    expect(minorUnitsSchema.parse('-45050')).toBe('-45050');
    expect(minorUnitsSchema.parse('9007199254740993')).toBe('9007199254740993');

    for (const amount of [
      45050,
      '4.50',
      '',
      '1e3',
      'NaN',
      '+10',
      '12\n',
      ' 10',
    ]) {
      expect(minorUnitsSchema.safeParse(amount).success).toBe(false);
    }
  });

  test('rejects unknown codes and enum values', () => {
    expect(currencyCodeSchema.parse('RUB')).toBe('RUB');
    expect(currencyCodeSchema.parse('JPY')).toBe('JPY');
    expect(currencyCodeSchema.safeParse('ZZZ').success).toBe(false);
    expect(currencyCodeSchema.safeParse('rub').success).toBe(false);
    expect(accountKindSchema.safeParse('loan').success).toBe(false);
    expect(categoryTypeSchema.safeParse('transfer').success).toBe(false);
    expect(transactionKindSchema.safeParse('adjustment').success).toBe(true);
    expect(transactionKindSchema.safeParse('refund').success).toBe(false);
  });
});
