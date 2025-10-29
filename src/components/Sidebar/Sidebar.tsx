import { useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import logo from '../../assets/FRVtubers_Vmusic.png';

import { FAVORITES_PLAYLIST_ID, useUserStore } from '../../stores/userStore';

import './Sidebar.scss';

type NavItem = {
  to: string;
  label: string;
  iconClass: string;
  exact?: boolean;
};

const MAIN_NAV: NavItem[] = [
  { to: '/', label: 'Accueil', iconClass: 'fa-solid fa-house', exact: true },
  { to: '/search', label: 'Recherche', iconClass: 'fa-solid fa-magnifying-glass' },
  {
    to: `/playlist/${FAVORITES_PLAYLIST_ID}`,
    label: 'Favoris',
    iconClass: 'fa-solid fa-heart',
  },
];

export function Sidebar() {
  const navigate = useNavigate();
  const playlists = useUserStore((state) => state.playlists);
  const createPlaylist = useUserStore((state) => state.createPlaylist);

  const playlistList = useMemo(
    () =>
      Object.values(playlists).sort((a, b) =>
        a.updatedAt < b.updatedAt ? 1 : -1,
      ),
    [playlists],
  );

  const handleCreatePlaylist = () => {
    const name = window.prompt('Nom de la playlist');
    if (!name) {
      return;
    }
    const playlist = createPlaylist(name.trim());
    navigate(`/playlist/${playlist.id}`);
  };

  return (
    <div className="sidebar">
      <div className="sidebar__brand">
        <NavLink to={"/"}>
          <span className="sidebar__brand-logo" aria-hidden>
            <img src={logo} alt="FRVArt" />
          </span>
        </NavLink>
        <div>
          <p className="sidebar__brand-subtitle">VTuber & Vsinger FR</p>
        </div>
      </div>

      <nav className="sidebar__section">
        <p className="sidebar__section-title">Explorer</p>
        <ul className="sidebar__nav">
          {MAIN_NAV.map((item) => (
            <li key={item.label}>
              <NavLink
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  isActive ? 'sidebar__link sidebar__link--active' : 'sidebar__link'
                }
              >
                <i className={`sidebar__icon ${item.iconClass}`} aria-hidden />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar__section sidebar__section--library">
        <div className="sidebar__section-header">
          <p className="sidebar__section-title">Playlists</p>
          <button className="sidebar__newplaylist" type="button" onClick={handleCreatePlaylist} title="Créer une playlist">
            <i className="fa-solid fa-plus" aria-hidden />
          </button>
        </div>
        {playlistList.length === 0 ? (
          <p className="sidebar__empty">Crée ta première playlist pour la retrouver ici.</p>
        ) : (
          <ul className="sidebar__nav sidebar__nav--library">
            {playlistList.map((playlist) => (
              <li key={playlist.id}>
                <NavLink
                  to={`/playlist/${playlist.id}`}
                  className={({ isActive }) =>
                    isActive ? 'sidebar__link sidebar__link--active' : 'sidebar__link'
                  }
                >
                  <i className="sidebar__icon fa-solid fa-music" aria-hidden />
                  <span>{playlist.name}</span>
                </NavLink>
              </li>
            ))}
            <li>
              <div className='sidebar__link button__new_playlist' onClick={handleCreatePlaylist} style={{ cursor:"pointer" }}>
                <i className="sidebar__icon fa-solid fa-plus" aria-hidden />
                <span>Créer une playlist</span>
              </div>
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}
