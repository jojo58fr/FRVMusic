import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';

import { PlayerBar } from '../components/PlayerBar/PlayerBar';
import { Sidebar } from '../components/Sidebar/Sidebar';
import { TopBar } from '../components/TopBar/TopBar';
import { useLibraryStore } from '../stores/libraryStore';
import { useUserStore } from '../stores/userStore';

import './AppLayout.scss';

import './AppLayout.scss';

export function AppLayout() {
  const theme = useUserStore((state) => state.theme);
  const isFullscreenBackground = useUserStore((state) => state.isFullscreenBackground);
  const loading = useLibraryStore((state) => state.loading);
  const error = useLibraryStore((state) => state.error);
  const fetchCatalog = useLibraryStore((state) => state.fetchCatalog);
  const isReady = !loading && !error;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div className="app-shell">
      <aside className="app-shell__sidebar">
        <Sidebar />
      </aside>
      <div className="app-shell__content">
        <TopBar />
        <main className="app-shell__main">
          {loading && (
            <div className="app-shell__loader" role="status">
              <i className="fa-solid fa-circle-notch fa-spin" aria-hidden />
              <p>Chargement de la bibliothèque...</p>
            </div>
          )}
          {!loading && error && (
            <div className="app-shell__loader app-shell__loader--error" role="alert">
              <p>{error}</p>
              <button type="button" onClick={fetchCatalog}>
                Réessayer
              </button>
            </div>
          )}
           {isReady && (
             <div className={isFullscreenBackground ? 'app-shell__outlet--video-background' : ''}>
               <Outlet />
             </div>
           )}
          <div
            id="youtube-embed-dock"
            className="app-shell__embed-dock home-section"
            aria-hidden
          />
        </main>
      </div>
      <div className="app-shell__player">
        <PlayerBar />
      </div>
    </div>
  );
}
