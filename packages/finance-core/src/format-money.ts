import { currencyCodeSchema, minorUnitsSchema } from '@money-level/contracts';
import type { CurrencyCode, MinorUnits } from '@money-level/contracts';

export function formatMoney(
  amount: MinorUnits,
  currency: CurrencyCode,
  options: { hideAmount?: boolean } = {},
): string {
  if (options.hideAmount) return '••••';

  const formatter = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: currencyCodeSchema.parse(currency),
  });
  const scale = formatter.resolvedOptions().maximumFractionDigits ?? 0;
  const divisor = 10n ** BigInt(scale);
  const value = BigInt(minorUnitsSchema.parse(amount));
  const whole = value / divisor;
  const remainder = value % divisor;
  const fraction = (remainder < 0n ? -remainder : remainder)
    .toString()
    .padStart(scale, '0');

  // A value between -1 and 0 major units keeps its minus sign in the formatted parts.
  return formatter
    .formatToParts(value < 0n && whole === 0n ? -0 : whole)
    .map((part) => (part.type === 'fraction' ? fraction : part.value))
    .join('');
}
