import { Link, NavLink, Outlet } from 'react-router-dom';
import './app-frame.css';

const tabs = [
  { path: '/', label: 'Главная', icon: '⌂' },
  { path: '/history', label: 'История', icon: '≡' },
  { path: '/analytics', label: 'Аналитика', icon: '▥' },
  { path: '/goals', label: 'Цели', icon: '◎' },
  { path: '/profile', label: 'Профиль', icon: '◉' },
];

export function AppFrame() {
  return (
    <div className="app-frame">
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
      </header>
      <main className="app-main" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
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
    </div>
  );
}
