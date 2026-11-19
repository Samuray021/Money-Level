import { Link } from 'react-router-dom';
import './management.css';

export function Profile() {
  return (
    <section className="management">
      <h1>Профиль</h1>
      <Link className="management-link" to="/profile/humor">
        Компаньон и юмор
      </Link>
      <Link className="management-link" to="/profile/accounts">
        Счета
      </Link>
      <Link className="management-link" to="/profile/categories">
        Категории
      </Link>
    </section>
  );
}
