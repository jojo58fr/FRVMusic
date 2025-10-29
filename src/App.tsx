import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { AppLayout } from './layouts/AppLayout';
import { ArtistPage } from './pages/ArtistPage';
import { HomePage } from './pages/HomePage';
import { PlaylistPage } from './pages/PlaylistPage';
import { SearchPage } from './pages/SearchPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'artist/:artistId', element: <ArtistPage /> },
      { path: 'playlist/:playlistId', element: <PlaylistPage /> },
      { path: 'search', element: <SearchPage /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}

export default App;
