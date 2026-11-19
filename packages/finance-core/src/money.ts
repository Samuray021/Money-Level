import { currencyCodeSchema, minorUnitsSchema } from '@money-level/contracts';
import type { CurrencyCode, MinorUnits } from '@money-level/contracts';

const maxEnteredMinorUnits = 9_223_372_036_854_775_807n;

interface AmountOptions {
  allowNegative?: boolean;
  allowZero?: boolean;
}

function parseDecimalAmount(
  input: string,
  scale: number,
  options: AmountOptions,
): MinorUnits {
  const parts = /^(?<sign>-?)(?<whole>\d+)(?:[.,](?<fraction>\d+))?$/.exec(
    input,
  )?.groups;
  const fraction = parts?.fraction ?? '';
  if (
    !parts?.whole ||
    fraction.length > scale ||
    (parts.sign === '-' && !options.allowNegative)
  ) {
    throw new RangeError('Enter a valid amount for the selected currency.');
  }

  const digits =
    (parts.whole + fraction.padEnd(scale, '0')).replace(/^0+/, '') || '0';
  if (
    (!options.allowZero && digits === '0') ||
    digits.length > 19 ||
    BigInt(digits) > maxEnteredMinorUnits
  ) {
    throw new RangeError('Amount is outside the supported range.');
  }
  return digits !== '0' && parts.sign === '-' ? '-' + digits : digits;
}

export function parseRubAmount(input: string): MinorUnits {
  return parseDecimalAmount(input, 2, {});
}

export function parseCurrencyAmount(
  input: string,
  currency: CurrencyCode,
  options: AmountOptions = {},
): MinorUnits {
  return parseDecimalAmount(input, currencyScale(currency), options);
}

function currencyScale(currency: CurrencyCode): number {
  return (
    new Intl.NumberFormat('ru-RU', {
      currency: currencyCodeSchema.parse(currency),
      style: 'currency',
    }).resolvedOptions().maximumFractionDigits ?? 0
  );
}

export function currencyAmountForInput(
  amount: MinorUnits,
  currency: CurrencyCode,
): string {
  const value = toMinorBigInt(amount);
  const scale = currencyScale(currency);
  const sign = value < 0n ? '-' : '';
  const digits = (value < 0n ? -value : value)
    .toString()
    .padStart(scale + 1, '0');
  if (scale === 0) return sign + digits;
  return sign + digits.slice(0, -scale) + ',' + digits.slice(-scale);
}

function toMinorBigInt(amount: MinorUnits): bigint {
  return BigInt(minorUnitsSchema.parse(amount));
}

export function addMinorUnits(left: MinorUnits, right: MinorUnits): MinorUnits {
  return (toMinorBigInt(left) + toMinorBigInt(right)).toString();
}

export function subtractMinorUnits(
  left: MinorUnits,
  right: MinorUnits,
): MinorUnits {
  return (toMinorBigInt(left) - toMinorBigInt(right)).toString();
}

export function compareMinorUnits(
  left: MinorUnits,
  right: MinorUnits,
): -1 | 0 | 1 {
  const difference = toMinorBigInt(left) - toMinorBigInt(right);
  if (difference === 0n) return 0;
  return difference < 0n ? -1 : 1;
}
