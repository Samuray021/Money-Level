import type {
  MinorUnits,
  ProfileSettings,
  RandomSource,
} from '@money-level/contracts';

export interface RoastMetrics {
  expenseMinor: MinorUnits;
  priorExpenseMinor: MinorUnits;
  expenseCount: number;
  leadingCategory?: { name: string; amountMinor: MinorUnits };
}

export type RoastCard =
  | { kind: 'total'; text: string; formula: string; amountMinor: MinorUnits }
  | { kind: 'frequency'; text: string; formula: string; count: number }
  | {
      kind: 'category';
      text: string;
      formula: string;
      category: string;
      amountMinor: MinorUnits;
    }
  | {
      kind: 'comparison';
      text: string;
      formula: string;
      currentMinor: MinorUnits;
      priorMinor: MinorUnits;
    }
  | { kind: 'empty' | 'no-baseline'; text: string; formula: string };

function line(
  options: readonly [string, string],
  random: RandomSource,
): string {
  return random.next() < 0.5 ? options[0] : options[1];
}

export function buildRoastCards(
  metrics: RoastMetrics,
  mode: ProfileSettings['humorMode'],
  random: RandomSource,
): RoastCard[] {
  if (metrics.expenseCount === 0)
    return [
      {
        kind: 'empty',
        text: 'Данных пока мало.',
        formula: 'В выбранном периоде нет сохранённых расходов.',
      },
    ];
  const playful = mode === 'roast' || mode === 'chaos';
  const cards: RoastCard[] = [
    {
      kind: 'total',
      text: playful
        ? line(
            [
              'У чеков нашёлся общий знаменатель.',
              'Калькулятор собрал чеки в один итог.',
            ],
            random,
          )
        : 'Всего расходов',
      formula: 'Сумма всех расходов за выбранный период по дате операции.',
      amountMinor: metrics.expenseMinor,
    },
    {
      kind: 'frequency',
      text: playful
        ? line(
            [
              'Чеки собрались на перекличку.',
              'Сколько записей попало в журнал.',
            ],
            random,
          )
        : 'Количество расходов',
      formula: 'Количество сохранённых расходов за выбранный период.',
      count: metrics.expenseCount,
    },
  ];
  if (metrics.leadingCategory)
    cards.push({
      kind: 'category',
      text: playful
        ? line(
            [
              'Одна категория забрала первый ряд.',
              'Лидер расходов вышел на сцену.',
            ],
            random,
          )
        : 'Крупнейшая категория расходов',
      formula:
        'Суммы расходов группируются по категории. Показана наибольшая сумма.',
      category: metrics.leadingCategory.name,
      amountMinor: metrics.leadingCategory.amountMinor,
    });
  if (metrics.priorExpenseMinor === '0')
    cards.push({
      kind: 'no-baseline',
      text: 'Нет базы для сравнения.',
      formula: 'В предыдущем таком же периоде сумма расходов равна нулю.',
    });
  else
    cards.push({
      kind: 'comparison',
      text: playful
        ? line(
            ['Два периода сверили чеки.', 'Калькулятор сравнил это с прошлым.'],
            random,
          )
        : 'Сравнение с предыдущим периодом',
      formula:
        'Суммы расходов за выбранный период и за непосредственно предыдущий период той же длины.',
      currentMinor: metrics.expenseMinor,
      priorMinor: metrics.priorExpenseMinor,
    });
  return cards;
}
