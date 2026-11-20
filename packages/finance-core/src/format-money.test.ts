import { expect, test } from 'vitest';
import { formatMoney } from './index.js';

test('formats grouping, decimal fractions and signs in ru-RU', () => {
  expect(formatMoney('123405', 'RUB')).toBe('1\u00a0234,05\u00a0₽');
  expect(formatMoney('-1', 'RUB')).toBe('-0,01\u00a0₽');
  expect(formatMoney('0', 'RUB')).toBe('0,00\u00a0₽');
  expect(formatMoney('9007199254740993', 'RUB')).toBe(
    '90\u00a0071\u00a0992\u00a0547\u00a0409,93\u00a0₽',
  );
});

test('uses the selected currency precision and masks amounts on request', () => {
  expect(formatMoney('1000', 'JPY')).toBe('1\u00a0000\u00a0¥');
  expect(formatMoney('-12399999', 'RUB', { hideAmount: true })).toBe('••••');
});
