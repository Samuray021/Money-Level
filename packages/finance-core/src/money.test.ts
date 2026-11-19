import { expect, test } from 'vitest';
import {
  currencyAmountForInput,
  parseCurrencyAmount,
  parseRubAmount,
} from './index.js';

test.each([
  ['450', '45000'],
  ['450,5', '45050'],
  ['450.50', '45050'],
  ['000.01', '1'],
  ['92233720368547758.07', '9223372036854775807'],
])('parses %s RUB exactly', (input, expected) => {
  expect(parseRubAmount(input)).toBe(expected);
});

test.each([
  '',
  '0',
  '0.00',
  '-1',
  '+1',
  '1.001',
  '1e3',
  'NaN',
  '1,',
  ' 4',
  '4\n',
  '92233720368547758.08',
])('rejects invalid or out-of-range RUB input %j', (input) => {
  expect(() => parseRubAmount(input)).toThrow(RangeError);
});

test('respects the selected currency precision and accepts signed starting balances', () => {
  expect(parseCurrencyAmount('25', 'JPY')).toBe('25');
  expect(parseCurrencyAmount('0,001', 'KWD')).toBe('1');
  expect(
    parseCurrencyAmount('-0', 'RUB', { allowNegative: true, allowZero: true }),
  ).toBe('0');
  expect(() => parseCurrencyAmount('25,01', 'JPY')).toThrow(RangeError);
});

test('currency edit values round-trip through the decimal parser without grouping or loss', () => {
  const options = { allowNegative: true, allowZero: true };
  for (const [amount, currency] of [
    ['-1', 'RUB'],
    ['0', 'JPY'],
    ['9007199254740993', 'KWD'],
  ] as const) {
    expect(
      parseCurrencyAmount(
        currencyAmountForInput(amount, currency),
        currency,
        options,
      ),
    ).toBe(amount);
  }
});
