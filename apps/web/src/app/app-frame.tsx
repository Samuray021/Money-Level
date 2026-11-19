import { BudgetAlerts } from '../features/budgets/budget-alerts.js';
import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { PrivacyToggle } from '../components/privacy-toggle.js';
import './app-frame.css';

const tabs = [
  { path: '/', label: 'Главная', icon: '⌂' },
  { path: '/history', label: 'История', icon: '≡' },
  { path: '/analytics', label: 'Аналитика', icon: '▥' },
  { path: '/goals', label: 'Цели', icon: '◎' },
  { path: '/profile', label: 'Профиль', icon: '◉' },
];

export function AppFrame({
  showNavigation = true,
}: {
  showNavigation?: boolean;
}) {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return (
    <div
      className={showNavigation ? 'app-frame' : 'app-frame app-frame--setup'}
    >
      <a className="skip-link" href="#main-content">
        К содержимому
      </a>
      <header className="app-header">
        <Link className="wordmark" to="/" aria-label="Money Level, главная">
          <span className="wordmark-icon" aria-hidden="true">
            M
          </span>
          <span>
            MONEY<span className="wordmark-accent">LEVEL</span>
          </span>
        </Link>
        {showNavigation && <PrivacyToggle />}
      </header>
      {!online && (
        <p className="app-offline" role="status">
          Офлайн · изменения сохраняются на устройстве
        </p>
      )}
      {showNavigation && <BudgetAlerts />}
      <main className="app-main" id="main-content" tabIndex={-1}>
        <Suspense fallback={<p role="status">Загружаем раздел…</p>}>
          <Outlet />
        </Suspense>
      </main>
      {showNavigation && (
        <nav className="tab-bar" aria-label="Основное меню">
          {tabs.map(({ path, label, icon }) => (
            <NavLink key={path} to={path} end={path === '/'}>
              <span className="tab-icon" aria-hidden="true">
                {icon}
              </span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
