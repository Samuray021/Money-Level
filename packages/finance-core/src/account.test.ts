import { expect, test } from 'vitest';
import { accountSchema } from './index.js';
import { accountInput } from './fixtures.js';

test('validates identifiers, trimmed names, account type and base currency code', () => {
  expect(
    accountSchema.parse({ ...accountInput, name: '   Карта   ' }).name,
  ).toBe('Карта');

  for (const invalid of [
    { id: 'broken' },
    { name: '   ' },
    { kind: 'credit' },
    { currencyCode: 'ZZZ' },
    { sortOrder: -1 },
    { archived: 'false' },
  ]) {
    expect(
      accountSchema.safeParse({ ...accountInput, ...invalid }).success,
    ).toBe(false);
  }
});
