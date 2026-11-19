import { expect, test } from 'vitest';
import {
  addMinorUnits,
  compareMinorUnits,
  parseRubAmount,
  subtractMinorUnits,
} from './index.js';

test('represents 0.10 + 0.20 as exactly 30 minor units', () => {
  expect(addMinorUnits(parseRubAmount('0.10'), parseRubAmount('0.20'))).toBe(
    '30',
  );
});

test('adds, subtracts and compares signed integers beyond the safe JS number range', () => {
  expect(addMinorUnits('9007199254740993', '2')).toBe('9007199254740995');
  expect(subtractMinorUnits('9007199254740993', '9007199254740994')).toBe('-1');
  expect(compareMinorUnits('-2', '-1')).toBe(-1);
  expect(compareMinorUnits('9007199254740994', '9007199254740993')).toBe(1);
  expect(compareMinorUnits('0001', '1')).toBe(0);
  expect(() => addMinorUnits('0x10', '1')).toThrow();
});
