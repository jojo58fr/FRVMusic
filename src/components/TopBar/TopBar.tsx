import { type FormEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useUserStore } from '../../stores/userStore';

import './TopBar.scss';

export function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const toggleTheme = useUserStore((state) => state.toggleTheme);
  const theme = useUserStore((state) => state.theme);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const current = params.get('q') ?? '';
    setQuery(current);
  }, [location.search]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      navigate('/search', { replace: true });
    } else {
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  };

  return (
    <header className="topbar">
      <form className="topbar__search" onSubmit={handleSubmit}>
        <span className="topbar__search-icon" aria-hidden>
          <i className="fa-solid fa-magnifying-glass" />
        </span>
        <input
          type="search"
          placeholder="Rechercher un artiste, un morceau..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </form>

      <div className="topbar__actions">
        <button
          type="button"
          className="topbar__theme-toggle"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
        >
          <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`} aria-hidden />
        </button>
      </div>
    </header>
  );
}
