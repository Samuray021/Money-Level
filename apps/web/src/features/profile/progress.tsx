import { getAchievementProgress } from '@money-level/application';
import { Button } from '@money-level/ui-kit';
import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useJournal } from '../../app/journal-context.js';
import { useJournalQuery } from '../../app/use-journal-query.js';
import './management.css';

type Progress = Awaited<ReturnType<typeof getAchievementProgress>>;
const names: Record<Progress['achievements'][number]['kind'], string> = {
  'first-operation': 'Первая операция',
  'weekly-journal': 'Семь дней учёта за неделю',
  'first-goal': 'Первая цель',
  'first-backup': 'Первая резервная копия',
};
const date = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium' });

export function AchievementProgress() {
  const { commands } = useJournal();
  const read = useCallback(
    () => getAchievementProgress(commands.storage),
    [commands.storage],
  );
  const { state, retry } = useJournalQuery(read);

  return (
    <section className="management">
      <Link to="/profile">К профилю</Link>
      <h1>Прогресс</h1>
      {state.status === 'loading' && <p role="status">Считаем прогресс…</p>}
      {state.status === 'error' && (
        <>
          <p role="alert">Не удалось загрузить достижения.</p>
          <Button onClick={retry}>Повторить</Button>
        </>
      )}
      {state.status === 'ready' && (
        <>
          <section className="management-row" aria-labelledby="current-level">
            <h2 id="current-level">Уровень {state.value.level}</h2>
            <p>{state.value.totalXp} XP</p>
            {state.value.nextThreshold === null ? (
              <p>Достигнут максимальный уровень.</p>
            ) : (
              <>
                <progress
                  className="level-progress"
                  aria-label="Прогресс до следующего уровня"
                  value={state.value.totalXp - state.value.levelStart}
                  max={state.value.nextThreshold - state.value.levelStart}
                />
                <p>До следующего уровня {state.value.remainingXp} XP</p>
              </>
            )}
          </section>
          <h2>Достижения</h2>
          {state.value.achievements.length ? (
            <ul className="management-list">
              {state.value.achievements.map((achievement) => (
                <li className="management-row" key={achievement.id}>
                  <strong>{names[achievement.kind]}</strong>
                  <span>+{achievement.xp} XP</span>
                  <time dateTime={achievement.earnedAt}>
                    {date.format(new Date(achievement.earnedAt))}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p>Достижений пока нет. Добавьте первую операцию в журнал.</p>
          )}
        </>
      )}
    </section>
  );
}
