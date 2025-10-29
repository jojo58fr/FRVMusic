import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';

import { PlayerBar } from '../components/PlayerBar/PlayerBar';
import { Sidebar } from '../components/Sidebar/Sidebar';
import { TopBar } from '../components/TopBar/TopBar';
import { useUserStore } from '../stores/userStore';

import './AppLayout.scss';

export function AppLayout() {
  const theme = useUserStore((state) => state.theme);

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
          <Outlet />
        </main>
      </div>
      <div className="app-shell__player">
        <PlayerBar />
      </div>
    </div>
  );
}
