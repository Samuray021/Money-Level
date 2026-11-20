import { currentJournalSchemaVersion } from '@money-level/storage-indexeddb';
import { Link } from 'react-router-dom';
import './management.css';

declare const __MONEY_LEVEL_APP_VERSION__: string;

export function Profile() {
  return (
    <section className="management">
      <h1>Профиль</h1>
      <Link className="management-link" to="/profile/progress">
        Прогресс и достижения
      </Link>
      <Link className="management-link" to="/profile/humor">
        Компаньон и юмор
      </Link>
      <Link className="management-link" to="/profile/backup">
        Резервные копии и данные
      </Link>
      <Link className="management-link" to="/profile/accounts">
        Счета
      </Link>
      <Link className="management-link" to="/profile/categories">
        Категории
      </Link>
      <dl className="backup-details">
        <div>
          <dt>Версия приложения</dt>
          <dd data-testid="app-version">{__MONEY_LEVEL_APP_VERSION__}</dd>
        </div>
        <div>
          <dt>Версия базы</dt>
          <dd data-testid="schema-version">{currentJournalSchemaVersion}</dd>
        </div>
      </dl>
    </section>
  );
}
