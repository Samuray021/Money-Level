import type { CurrencyCode, MinorUnits } from '@money-level/contracts';
import { formatMoney } from '@money-level/finance-core';
import { useJournal } from '../app/journal-context.js';

export function MoneyAmount({
  amount,
  currency,
}: {
  amount: MinorUnits;
  currency?: CurrencyCode;
}) {
  const { profile } = useJournal();
  if (!profile) return null;
  if (profile.balanceHidden) {
    return (
      <>
        <span aria-hidden="true">••••</span>
        <span className="visually-hidden">Сумма скрыта</span>
      </>
    );
  }
  return formatMoney(amount, currency ?? profile.baseCurrency);
}
