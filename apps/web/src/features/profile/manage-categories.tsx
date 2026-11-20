import {
  archiveJournalCategory,
  ensureStarterCategories,
  saveCategory,
} from '@money-level/application';
import type { CategoryType } from '@money-level/contracts';
import type { Category } from '@money-level/finance-core';
import { Button } from '@money-level/ui-kit';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useJournal } from '../../app/journal-context.js';
import { useJournalQuery } from '../../app/use-journal-query.js';
import './management.css';

const icons = [
  ['other', 'Обычная'],
  ['food', 'Еда'],
  ['salary', 'Зарплата'],
  ['work', 'Работа'],
  ['gift', 'Подарки'],
  ['refund', 'Возвраты'],
  ['transport', 'Транспорт'],
  ['entertainment', 'Развлечения'],
  ['subscriptions', 'Подписки'],
  ['shopping', 'Покупки'],
  ['home', 'Дом'],
  ['health', 'Здоровье'],
] as const;

const categoryMarks: Record<string, string> = {
  food: '◇',
  salary: '₽',
  work: '▣',
  gift: '✦',
  refund: '↶',
  transport: '↗',
  entertainment: '★',
  subscriptions: '↻',
  shopping: '◫',
  home: '⌂',
  health: '✚',
};

function CategoryForm({
  category,
  initialType,
  done,
}: {
  category: Category | undefined;
  initialType: CategoryType;
  done: () => void;
}) {
  const { commands } = useJournal();
  const [name, setName] = useState(category?.name ?? '');
  const [type, setType] = useState<CategoryType>(category?.type ?? initialType);
  const [icon, setIcon] = useState(category?.icon ?? 'other');
  const [color, setColor] = useState(category?.color ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    setError('');
    try {
      await saveCategory(commands, {
        ...(category ? { id: category.id } : {}),
        name,
        type,
        icon,
        ...(color ? { color } : {}),
      });
      done();
    } catch (cause) {
      setError(
        cause instanceof RangeError
          ? 'Проверьте, что название свободно для этого типа категории.'
          : 'Не удалось сохранить категорию. Проверьте название.',
      );
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }
  return (
    <form
      className="form-card"
      onSubmit={submit}
      aria-label={category ? 'Изменение категории' : 'Новая категория'}
    >
      <label className="form-field">
        Название
        <input
          required
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label className="form-field">
        Тип
        <select
          disabled={!!category}
          value={type}
          onChange={(event) =>
            setType(event.target.value === 'income' ? 'income' : 'expense')
          }
        >
          <option value="expense">Расход</option>
          <option value="income">Доход</option>
        </select>
      </label>
      <label className="form-field">
        Значок
        <select value={icon} onChange={(event) => setIcon(event.target.value)}>
          {icons.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="form-field">
        Цвет
        <select
          value={color}
          onChange={(event) => setColor(event.target.value)}
        >
          <option value="">По умолчанию</option>
          <option value="lavender">Сиреневый</option>
          <option value="lime">Лаймовый</option>
        </select>
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="management-actions">
        <Button type="submit" busy={saving}>
          Сохранить
        </Button>
        <Button variant="secondary" disabled={saving} onClick={done}>
          Отмена
        </Button>
      </div>
    </form>
  );
}

export function ManageCategories() {
  const { commands, profile } = useJournal();
  const [type, setType] = useState<CategoryType>('expense');
  const [edited, setEdited] = useState<Category | 'new' | null>(null);
  const [archiving, setArchiving] = useState('');
  const [error, setError] = useState(false);
  const seeded = profile?.starterCategoriesReady;

  const read = useCallback(
    () => commands.storage.read(({ categories }) => categories.list()),
    [commands.storage],
  );
  const { state, retry } = useJournalQuery(read);

  useEffect(() => {
    if (!seeded)
      void ensureStarterCategories(commands).catch(() => setError(true));
  }, [commands, seeded]);

  async function archive(category: Category) {
    if (archiving) return;
    setArchiving(category.id);
    try {
      await archiveJournalCategory(commands, category.id);
    } catch {
      setError(true);
    } finally {
      setArchiving('');
    }
  }

  const items =
    state.status === 'ready'
      ? state.value.filter(
          (category) => category.type === type && !category.deletedAt,
        )
      : [];
  return (
    <section className="management">
      <Link to="/profile">К профилю</Link>
      <h1>Категории</h1>
      {error && (
        <p role="alert" className="form-error">
          Не удалось обновить категории.
        </p>
      )}
      {state.status === 'loading' ? (
        <p role="status">Загружаем категории…</p>
      ) : state.status === 'error' ? (
        <Button variant="secondary" onClick={retry}>
          Повторить
        </Button>
      ) : (
        <>
          <label className="form-field">
            Категории
            <select
              value={type}
              onChange={(event) => {
                setType(event.target.value === 'income' ? 'income' : 'expense');
                setEdited(null);
              }}
            >
              <option value="expense">Расходы</option>
              <option value="income">Доходы</option>
            </select>
          </label>
          {edited === null ? (
            <Button onClick={() => setEdited('new')}>Добавить категорию</Button>
          ) : (
            <CategoryForm
              key={edited === 'new' ? 'new' : edited.id}
              category={edited === 'new' ? undefined : edited}
              initialType={type}
              done={() => setEdited(null)}
            />
          )}
          {items.length === 0 && (
            <p className="form-intro">Здесь пока нет категорий.</p>
          )}
          <ul className="management-list">
            {items.map((category) => (
              <li className="management-row" key={category.id}>
                <div className="management-name">
                  <span
                    className="category-color"
                    data-color={category.color}
                    aria-hidden="true"
                  >
                    {categoryMarks[category.icon] ?? '•'}
                  </span>
                  <strong>{category.name}</strong>
                  {category.archived && <small>В архиве</small>}
                </div>
                {!category.archived && (
                  <div className="management-actions">
                    <Button
                      variant="secondary"
                      aria-label={'Изменить ' + category.name}
                      onClick={() => setEdited(category)}
                    >
                      Изменить
                    </Button>
                    <Button
                      variant="secondary"
                      busy={archiving === category.id}
                      aria-label={'Архивировать ' + category.name}
                      onClick={() => {
                        void archive(category);
                      }}
                    >
                      В архив
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
