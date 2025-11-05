import { type KeyboardEvent, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';

import { useLibraryStore } from '../../stores/libraryStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useUserStore } from '../../stores/userStore';
import type { Track } from '../../types/library';
import { formatTime } from '../../utils/formatTime';

import './TrackList.scss';

type TrackListProps = {
  tracks: Track[];
  showArtist?: boolean;
  compact?: boolean;
  onRemoveTrack?: (trackId: string) => void;
};

export function TrackList({
  tracks,
  showArtist = false,
  compact = false,
  onRemoveTrack,
}: TrackListProps) {
  const artistsById = useLibraryStore((state) => state.artistsById);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const isFavorite = useUserStore((state) => state.isFavorite);
  const toggleFavorite = useUserStore((state) => state.toggleFavorite);
  const playlists = useUserStore((state) => state.playlists);
  const addTrackToPlaylist = useUserStore((state) => state.addTrackToPlaylist);
  const createPlaylist = useUserStore((state) => state.createPlaylist);

  const handlePlay = (trackId: string) => {
    playTrack(
      trackId,
      tracks.map((track) => track.id),
    );
  };

  const handleFavorite = (event: MouseEvent<HTMLButtonElement>, trackId: string) => {
    event.stopPropagation();
    toggleFavorite(trackId);
  };

  const handlePlayKey = (event: KeyboardEvent<HTMLDivElement>, trackId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handlePlay(trackId);
    }
  };

  const handleAddToPlaylist = (event: MouseEvent<HTMLButtonElement>, trackId: string) => {
    event.stopPropagation();
    const playlistArray = Object.values(playlists).sort((a, b) =>
      a.updatedAt < b.updatedAt ? 1 : -1,
    );

    if (playlistArray.length === 0) {
      const name = window.prompt('Nom de la nouvelle playlist ?');
      if (name) {
        const playlist = createPlaylist(name.trim());
        addTrackToPlaylist(playlist.id, trackId);
      }
      return;
    }

    const promptMessage = [
      'Ajouter a quelle playlist ?',
      ...playlistArray.map((playlist, index) => `${index + 1}. ${playlist.name}`),
      '',
      'Tape un numero existant ou un nouveau nom pour creer une playlist.',
    ].join('\n');

    const answer = window.prompt(promptMessage);
    if (!answer) {
      return;
    }

    const index = Number(answer);
    if (Number.isInteger(index) && index >= 1 && index <= playlistArray.length) {
      const playlist = playlistArray[index - 1];
      addTrackToPlaylist(playlist.id, trackId);
      return;
    }

    const playlist = createPlaylist(answer.trim());
    addTrackToPlaylist(playlist.id, trackId);
  };

  return (
    <div className={`track-list${compact ? ' track-list--compact' : ''}`}>
      {tracks.map((track) => {
        const artist = artistsById[track.artistId];
        const fav = isFavorite(track.id);
        const coverUrl = track.coverUrl ?? artist?.avatarUrl ?? undefined;
        const placeholder = (artist?.name ?? track.title).slice(0, 2).toUpperCase();

        return (
          <div
            className="track-list__row"
            key={track.id}
            onClick={() => handlePlay(track.id)}
            onKeyDown={(event) => handlePlayKey(event, track.id)}
            role="button"
            tabIndex={0}
          >
            <div className="track-list__thumb" aria-hidden>
              {coverUrl ? (
                <img src={coverUrl} alt="" loading="lazy" />
              ) : (
                <span>{placeholder}</span>
              )}
            </div>
            <div className="track-list__main">
              <p className="track-list__title">{track.title}</p>
              {showArtist && artist && (
                <Link
                  to={`/artist/${artist.id}`}
                  className="track-list__artist"
                  onClick={(event) => event.stopPropagation()}
                >
                  {artist.name}
                </Link>
              )}
              {track.tags && track.tags.length > 0 && (
                <p className="track-list__tags">{track.tags.slice(0, 3).join(' - ')}</p>
              )}
            </div>
            <div className="track-list__meta">
              <span className="track-list__duration">{formatTime(track.duration)}</span>
              <div className="track-list__actions" onClick={(event) => event.stopPropagation()}>
                <button
                  type="button"
                  className={`track-list__favorite${fav ? ' track-list__favorite--active' : ''}`}
                  onClick={(event) => handleFavorite(event, track.id)}
                  aria-label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                >
                  <i className={`fa-${fav ? 'solid' : 'regular'} fa-heart`} aria-hidden />
                </button>
                <button
                  type="button"
                  className="track-list__add"
                  onClick={(event) => handleAddToPlaylist(event, track.id)}
                  aria-label="Ajouter a une playlist"
                >
                  <i className="fa-solid fa-plus" aria-hidden />
                </button>
                {onRemoveTrack && (
                  <button
                    type="button"
                    className="track-list__remove"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onRemoveTrack(track.id);
                    }}
                    aria-label="Retirer de la playlist"
                  >
                    <i className="fa-solid fa-close" aria-hidden />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
