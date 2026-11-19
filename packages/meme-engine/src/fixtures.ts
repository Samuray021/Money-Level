export const sampleRule = {
  id: 'expense-small',
  triggers: ['transaction.expense.created'],
  tags: ['expense'],
  text: { 'ru-RU': 'Расход записан.' },
  fallbackText: 'Готово.',
  modes: ['neutral', 'roast', 'chaos'],
  profanity: false,
  weight: 1,
  rarity: 'normal',
  emotion: 'idle',
} as const;
export const samplePack = {
  id: 'default',
  version: '1.0.0',
  locale: 'ru-RU',
  rules: [sampleRule],
};
