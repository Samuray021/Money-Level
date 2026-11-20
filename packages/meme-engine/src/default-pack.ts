import type { DomainEventType } from '@money-level/contracts';
import { memePackSchema } from './pack.js';
import type { MemeEmotion } from './pack.js';

type Tone = 'neutral' | 'roast' | 'chaos';
type Line = readonly [
  id: string,
  event: DomainEventType | readonly [DomainEventType, ...DomainEventType[]],
  emotion: MemeEmotion,
  text: string,
  tone?: Tone,
  flag?: 'rare' | 'profanity',
];

const lines: readonly Line[] = [
  [
    'income-signal',
    'transaction.income.created',
    'happy',
    'Есть пополнение. Запись на месте.',
  ],
  [
    'income-cash-desk',
    'transaction.income.created',
    'celebrating',
    'Касса услышала приятный звук.',
    'roast',
  ],
  [
    'income-rocket',
    'transaction.income.created',
    'happy',
    'Калькулятор на секунду почувствовал себя ракетой.',
    'chaos',
  ],
  [
    'income-bonus',
    'transaction.income.created',
    'surprised',
    'И тут в сюжете появляется пополнение.',
    'roast',
  ],
  [
    'income-shiny',
    'transaction.income.created',
    'celebrating',
    'Даже копейки сегодня выглядят нарядно.',
    'roast',
  ],
  [
    'expense-stamp',
    'transaction.expense.created',
    'idle',
    'Расход записан в журнал.',
  ],
  [
    'expense-receipt',
    'transaction.expense.created',
    'happy',
    'Чек отметился и ушёл отдыхать.',
  ],
  [
    'expense-accounting',
    'transaction.expense.created',
    'sarcastic',
    'Калькулятор поправил галстук и всё пересчитал.',
    'roast',
  ],
  [
    'expense-witness',
    'transaction.expense.created',
    'surprised',
    'Журнал присутствовал при расходе и всё записал.',
    'roast',
  ],
  [
    'expense-paper',
    'transaction.expense.created',
    'sarcastic',
    'Бумажный чек попросил не звонить ему после работы.',
    'chaos',
  ],
  [
    'expense-tiny-storm',
    'transaction.expense.created',
    'surprised',
    'Блядь, даже у чека сегодня сюжет.',
    'chaos',
    'profanity',
  ],
  [
    'expense-desk-lamp',
    'transaction.expense.created',
    'sarcastic',
    'Да ёбаный фонарик. Шучу, запись на месте.',
    'roast',
    'profanity',
  ],
  [
    'transfer-courier',
    'transaction.transfer.created',
    'happy',
    'Деньги переехали на соседний счёт.',
  ],
  [
    'transfer-keys',
    'transaction.transfer.created',
    'surprised',
    'Деньги переехали, а ключи остались у тебя.',
    'roast',
  ],
  [
    'transfer-box',
    'transaction.transfer.created',
    'sarcastic',
    'Картонную коробку для переезда никто не заказывал.',
    'chaos',
  ],
  [
    'budget-notice',
    'budget.threshold.reached',
    'surprised',
    'Бюджет достиг порога. Можно сверить расходы.',
  ],
  [
    'budget-tap',
    'budget.threshold.reached',
    'sarcastic',
    'Бюджет слегка постучал по микрофону.',
    'roast',
  ],
  [
    'budget-office',
    'budget.threshold.reached',
    'surprised',
    'Лимит вышел из кабинета и попросил слово.',
    'chaos',
  ],
  ['goal-map', 'goal.created', 'happy', 'Новая цель записана.'],
  [
    'goal-direction',
    'goal.created',
    'happy',
    'У накоплений появилась точка на карте.',
    'roast',
  ],
  ['goal-step', 'goal.progress.updated', 'happy', 'Прогресс цели обновился.'],
  [
    'goal-finish',
    'goal.completed',
    'celebrating',
    'Цель достигнута. Есть повод улыбнуться.',
  ],
  [
    'goal-fanfare',
    'goal.completed',
    'celebrating',
    'Компаньон сыграл фанфары на кассовой ленте.',
    'chaos',
  ],
  [
    'report-shelves',
    'analytics.monthly.opened',
    'idle',
    'Месяц разложен по полкам.',
  ],
  [
    'report-calendar',
    'analytics.weekly.opened',
    'happy',
    'Семь дней поместились в одном отчёте.',
    'roast',
  ],
  ['session-ready', 'app.session.started', 'idle', 'Журнал готов к работе.'],
  [
    'journal-milestone',
    ['achievement.unlocked', 'backup.exported'],
    'happy',
    'Ещё один полезный шаг учёта.',
  ],
  [
    'rare-parade',
    'transaction.income.created',
    'celebrating',
    'Копейки устроили парад размером с кофейное блюдце.',
    'chaos',
    'rare',
  ],
  [
    'rare-noise',
    'transaction.expense.created',
    'surprised',
    'Чек на секунду превратился в тромбон.',
    'roast',
    'rare',
  ],
  [
    'rare-confetti',
    'goal.completed',
    'celebrating',
    'Из журнала выпала торжественное конфетти.',
    'chaos',
    'rare',
  ],
];

function fallback(event: DomainEventType): string {
  if (event.startsWith('transaction.')) return 'Операция сохранена.';
  if (event.startsWith('goal.')) return 'Цель обновлена.';
  if (event === 'budget.threshold.reached') return 'Порог бюджета достигнут.';
  if (event.startsWith('analytics.')) return 'Отчёт открыт.';
  return 'Журнал готов.';
}

export const defaultMemePack = memePackSchema.parse({
  id: 'default',
  version: '1.0.0',
  locale: 'ru-RU',
  rules: lines.map(([id, event, emotion, text, tone, flag]) => {
    const triggers = typeof event === 'string' ? [event] : event;
    return {
      id,
      triggers,
      tags: [
        triggers[0]?.split('.')[0] ?? 'journal',
        ...(flag === 'rare' ? ['rare'] : []),
      ],
      text: { 'ru-RU': text },
      fallbackText: fallback(triggers[0] ?? 'app.session.started'),
      modes: tone ? [tone] : ['neutral', 'roast', 'chaos'],
      profanity: flag === 'profanity',
      rarity: flag === 'rare' ? 'rare' : 'normal',
      weight: tone ? 2 : 3,
      emotion,
    };
  }),
});
