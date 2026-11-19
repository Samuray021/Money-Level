import type { getHistory, HistoryFilters } from '@money-level/application';
import { Button } from '@money-level/ui-kit';
import type { Deletion } from './delete-entry.js';

export type HistoryNavigationState = {
  historyFilters?: HistoryFilters;
  undo?: Deletion;
} | null;
type Options = Pick<
  Awaited<ReturnType<typeof getHistory>>,
  'accounts' | 'categories'
>;

const kinds = [
  ['income', 'Доход'],
  ['expense', 'Расход'],
  ['transfer', 'Перевод'],
  ['opening', 'Начальный остаток'],
  ['adjustment', 'Корректировка'],
];

export function HistoryFilterForm({
  filters,
  options,
  onChange,
}: {
  filters: HistoryFilters;
  options: Options | undefined;
  onChange: (filters: HistoryFilters) => void;
}) {
  function change(field: keyof HistoryFilters, value: string) {
    onChange({ ...filters, [field]: value });
  }
  const active = Object.values(filters).some(Boolean);
  return (
    <details className="history-filters" open={active ? true : undefined}>
      <summary>Фильтры</summary>
      <div className="history-filter-fields">
        <label className="form-field">
          Тип операции
          <select
            value={filters.kind ?? ''}
            onChange={(event) => change('kind', event.target.value)}
          >
            <option value="">Все операции</option>
            {kinds.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          Счёт
          <select
            value={filters.accountId ?? ''}
            onChange={(event) => change('accountId', event.target.value)}
          >
            <option value="">Все счета</option>
            {options?.accounts.map(({ id, name }) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          Категория
          <select
            value={filters.categoryId ?? ''}
            onChange={(event) => change('categoryId', event.target.value)}
          >
            <option value="">Все категории</option>
            {options?.categories.map(({ id, name, type }) => (
              <option key={id} value={id}>
                {name} · {type === 'income' ? 'доход' : 'расход'}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          Поиск по заметкам
          <input
            type="search"
            value={filters.note ?? ''}
            maxLength={500}
            onChange={(event) => change('note', event.target.value)}
          />
        </label>
        <label className="form-field">
          С даты
          <input
            type="date"
            value={filters.from ?? ''}
            onChange={(event) => change('from', event.target.value)}
          />
        </label>
        <label className="form-field">
          По дату
          <input
            type="date"
            value={filters.to ?? ''}
            onChange={(event) => change('to', event.target.value)}
          />
        </label>
      </div>
      {active && (
        <Button
          className="history-filter-reset"
          variant="secondary"
          onClick={() => onChange({})}
        >
          Сбросить фильтры
        </Button>
      )}
    </details>
  );
}
