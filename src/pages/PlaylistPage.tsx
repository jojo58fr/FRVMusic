import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { TrackList } from '../components/Library/TrackList';
import { useLibraryStore } from '../stores/libraryStore';
import { FAVORITES_PLAYLIST_ID, useUserStore } from '../stores/userStore';

import './PlaylistPage.scss';

export function PlaylistPage() {
  const params = useParams();
  const navigate = useNavigate();
  const tracksById = useLibraryStore((state) => state.tracksById);
  const favorites = useUserStore((state) => state.favorites);
  const toggleFavorite = useUserStore((state) => state.toggleFavorite);
  const getPlaylist = useUserStore((state) => state.getPlaylist);
  const updatePlaylist = useUserStore((state) => state.updatePlaylist);
  const deletePlaylist = useUserStore((state) => state.deletePlaylist);
  const removeTrackFromPlaylist = useUserStore((state) => state.removeTrackFromPlaylist);

  const playlistId = params.playlistId ?? FAVORITES_PLAYLIST_ID;
  const isFavorites = playlistId === FAVORITES_PLAYLIST_ID;
  const playlist = getPlaylist(playlistId);

  const tracks = useMemo(() => {
    const ids = isFavorites ? favorites : playlist?.trackIds ?? [];
    return ids
      .map((trackId) => tracksById[trackId])
      .filter((track) => track !== undefined);
  }, [favorites, isFavorites, playlist, tracksById]);

  const title = isFavorites ? 'Favoris' : playlist?.name ?? 'Playlist';
  const description = isFavorites
    ? 'Tous les morceaux que tu as ajoutés aux favoris.'
    : playlist?.description ?? 'Playlist personnalisée.';

  const handleRename = () => {
    if (isFavorites || !playlist) {
      return;
    }
    const next = window.prompt('Renommer la playlist', playlist.name);
    if (!next) {
      return;
    }
    updatePlaylist(playlist.id, { name: next.trim() });
  };

  const handleDelete = () => {
    if (isFavorites || !playlist) {
      return;
    }
    const confirmed = window.confirm('Supprimer définitivement cette playlist ?');
    if (!confirmed) {
      return;
    }
    deletePlaylist(playlist.id);
    navigate('/');
  };

  const handleRemoveTrack = (trackId: string) => {
    if (isFavorites) {
      toggleFavorite(trackId);
    } else if (playlist) {
      removeTrackFromPlaylist(playlist.id, trackId);
    }
  };

  return (
    <div className="page playlist-page">
      <header className="playlist-header">
        <div className="playlist-header__visual" aria-hidden>
          <span>{title.slice(0, 2).toUpperCase()}</span>
        </div>
        <div className="playlist-header__content">
          <p className="playlist-header__eyebrow">
            {isFavorites ? 'Collection personnelle' : 'Playlist utilisateur'}
          </p>
          <h1>{title}</h1>
          <p className="playlist-header__description">{description}</p>
          <p className="playlist-header__meta">
            {tracks.length} morceau{tracks.length > 1 ? 'x' : ''}
          </p>
          {!isFavorites && playlist && (
            <div className="playlist-header__actions">
              <button type="button" onClick={handleRename}>
                Renommer
              </button>
              <button type="button" onClick={handleDelete}>
                Supprimer
              </button>
            </div>
          )}
        </div>
      </header>

      <section className="playlist-section">
        {tracks.length === 0 ? (
          <div className="playlist-empty">
            <p>Aucun morceau pour l&apos;instant.</p>
            {isFavorites ? (
              <p>Ajoute des pistes aux favoris depuis la bibliothèque.</p>
            ) : (
              <p>Ajoute des pistes à partir des fiches artistes ou de la recherche.</p>
            )}
          </div>
        ) : (
          <TrackList
            tracks={tracks}
            showArtist
            onRemoveTrack={handleRemoveTrack}
          />
        )}
      </section>
    </div>
  );
}
