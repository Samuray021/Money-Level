export const instant = '2026-11-19T12:00:00.000Z';
export const accountId = 'c0a19a94-cbd4-45da-a30d-0a4dfd25f779';
export const entryId = 'f54a1fb3-e018-4d18-a06b-c27c0a2ced41';
export const accountInput = {
  id: accountId,
  name: 'Карта',
  kind: 'card',
  currencyCode: 'RUB',
  archived: false,
  sortOrder: 0,
  createdAt: instant,
  updatedAt: instant,
} as const;

export const categoryInput = {
  id: '48e007f4-6c46-4f2a-aa85-0aa19b622452',
  name: 'Еда вне дома',
  type: 'expense',
  archived: false,
  icon: 'food',
  createdAt: instant,
  updatedAt: instant,
} as const;
