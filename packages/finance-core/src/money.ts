import { minorUnitsSchema } from '@money-level/contracts';
import type { MinorUnits } from '@money-level/contracts';

const maxEnteredMinorUnits = 9_223_372_036_854_775_807n;

export function parseRubAmount(input: string): MinorUnits {
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(input);
  if (match?.[1] === undefined) {
    throw new RangeError(
      'Enter a positive amount with at most two decimal places.',
    );
  }

  const digits = (match[1] + (match[2] ?? '').padEnd(2, '0')).replace(
    /^0+/,
    '',
  );
  if (
    digits.length === 0 ||
    digits.length > 19 ||
    BigInt(digits) > maxEnteredMinorUnits
  ) {
    throw new RangeError('Amount is outside the supported range.');
  }
  return digits;
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
