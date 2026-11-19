import { Link } from 'react-router-dom';
import './management.css';

export function Profile() {
  return (
    <section className="management">
      <h1>Профиль</h1>
      <Link className="management-link" to="/profile/categories">
        Категории
      </Link>
    </section>
  );
}
