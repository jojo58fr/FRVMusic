import { useEffect, useMemo, useRef } from 'react';

import { useLibraryStore } from '../../stores/libraryStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useUserStore } from '../../stores/userStore';
import { formatTime } from '../../utils/formatTime';
import { seekYoutube } from '../../utils/youtubeController';

import './PlayerBar.scss';


export function PlayerBar() {
  const {
    queue,
    currentIndex,
    isPlaying,
    playNext,
    playPrevious,
    togglePlay,
    setIsPlaying,
    setProgress,
    setDuration,
    progress,
    duration,
  } = usePlayerStore((state) => state);

  const tracksById = useLibraryStore((state) => state.tracksById);
  const artistsById = useLibraryStore((state) => state.artistsById);

  const currentTrackId =
    currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : undefined;
  const currentTrack = currentTrackId ? tracksById[currentTrackId] : undefined;
  const currentArtist = currentTrack ? artistsById[currentTrack.artistId] : undefined;

  const volume = useUserStore((state) => state.volume);
  const setVolume = useUserStore((state) => state.setVolume);
  const toggleFavorite = useUserStore((state) => state.toggleFavorite);
  const favorites = useUserStore((state) => state.favorites);
  const setLastTrackId = useUserStore((state) => state.setLastTrackId);
  const youtubeEmbedMode = useUserStore((state) => state.youtubeEmbedMode);
  const cycleYoutubeEmbedMode = useUserStore((state) => state.cycleYoutubeEmbedMode);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackType = useMemo<'audio' | 'youtube' | null>(() => {
    if (!currentTrack) {
      return null;
    }
    if (currentTrack.sources.audioUrl) {
      return 'audio';
    }
    if (currentTrack.sources.youtubeId) {
      return 'youtube';
    }
    return null;
  }, [currentTrack]);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'metadata';
    }
  }, []);

  useEffect(() => {
    if (!currentTrackId) {
      setProgress(0);
      setDuration(0);
      setLastTrackId(undefined);
      return;
    }
    setProgress(0);
    if (currentTrack) {
      setDuration(currentTrack.duration ?? 0);
    }
    setLastTrackId(currentTrackId);
  }, [currentTrackId, currentTrack, setProgress, setDuration, setLastTrackId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (!currentTrack || playbackType !== 'audio') {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute('src');
      }
      return;
    }

    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (audio.src !== currentTrack.sources.audioUrl) {
      audio.src = currentTrack.sources.audioUrl ?? '';
    }

    audio.currentTime = 0;
    const play = async () => {
      try {
        if (isPlaying) {
          await audio.play();
        }
      } catch {
        setIsPlaying(false);
      }
    };
    void play();
  }, [currentTrack, playbackType, isPlaying, setIsPlaying]);

  useEffect(() => {
    if (playbackType !== 'audio') {
      return;
    }
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const handleEnded = () => {
      playNext();
    };

    const handleTimeUpdate = () => {
      setProgress(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      if (Number.isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [playNext, playbackType, setDuration, setProgress]);

  useEffect(() => {
    if (playbackType === 'audio') {
      const audio = audioRef.current;
      if (!audio) {
        return;
      }
      const action = isPlaying ? audio.play() : audio.pause();
      if (action instanceof Promise) {
        action.catch(() => setIsPlaying(false));
      }
      return;
    }
  }, [isPlaying, playbackType, setIsPlaying]);

  const handleSeek = (value: number) => {
    setProgress(value);
    if (playbackType === 'audio' && audioRef.current) {
      audioRef.current.currentTime = value;
    } else if (playbackType === 'youtube') {
      seekYoutube(value);
    }
  };

  const handleVolume = (value: number) => {
    const normalized = value / 100;
    setVolume(normalized);
  };

  const friendlyDuration =
    duration && Number.isFinite(duration) ? duration : currentTrack?.duration ?? 0;

  const isYoutubeTrack = playbackType === 'youtube';
  const fav = currentTrack ? favorites.includes(currentTrack.id) : false;
  const displayTitle = currentTrack?.title ?? 'Titre indisponible';
  const artworkUrl = currentTrack?.coverUrl ?? currentArtist?.avatarUrl ?? null;
  const artworkFallback = (currentArtist?.name ?? currentTrack?.title ?? 'FR')
    .slice(0, 2)
    .toUpperCase();
  const displaySubtitle = (() => {
    if (!currentTrack) {
      return '';
    }
    if (currentArtist) {
      return currentArtist.name;
    }
    return isYoutubeTrack ? 'YouTube' : 'Artiste inconnu';
  })();

  const embedModeDisplay = {
    sidebar: { icon: 'fa-align-left', label: 'Iframe a gauche' },
    fullscreen: { icon: 'fa-up-right-and-down-left-from-center', label: 'Plein ecran' },
    hidden: { icon: 'fa-eye-slash', label: 'Iframe masquee' },
    'bottom-right': { icon: 'fa-square-arrow-up-right', label: 'Bas a droite' },
    'top-left': { icon: 'fa-square-arrow-up-left', label: 'Haut a gauche' },
  } as const;
  const embedModeInfo = embedModeDisplay[youtubeEmbedMode] ?? embedModeDisplay.sidebar;
  const embedButtonTitle = `Position de la video : ${embedModeInfo.label}. Clique pour changer.`;

  return (
    <footer className="player-bar">

      <div className="player-bar__progress">
        <input
          type="range"
          min={0}
          max={friendlyDuration || 0}
          step={1}
          value={Math.min(progress, friendlyDuration || 0)}
          onChange={(event) => handleSeek(Number(event.target.value))}
          disabled={!currentTrack}
        />
      </div>

      <div className="player-bar__now-playing">
        {currentTrack ? (
          <>
            <div className="player-bar__artwork" aria-hidden>
              {artworkUrl ? (
                <img src={artworkUrl} alt="" />
              ) : (
                <span>{artworkFallback}</span>
              )}
            </div>
            <div className="player-bar__meta">
              <p className="player-bar__title">{displayTitle}</p>
              {displaySubtitle && <p className="player-bar__artist">{displaySubtitle}</p>}
            </div>
            <button
              type="button"
              className={`player-bar__favorite${
                fav ? ' player-bar__favorite--active' : ''
              }`}
              onClick={() => toggleFavorite(currentTrack.id)}
              title={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            >
              <i className={`fa-${fav ? 'solid' : 'regular'} fa-heart`} aria-hidden />
            </button>
          </>
        ) : (
          <p className="player-bar__placeholder">
            Selectionne un morceau pour commencer la lecture.
          </p>
        )}
      </div>

      <div className="player-bar__controls">
        <div className="player-bar__buttons">
          <button
            type="button"
            onClick={playPrevious}
            disabled={!currentTrack}
            aria-label="Morceau precedent"
          >
            <i className="fa-solid fa-backward-step" aria-hidden />
          </button>
          <button
            type="button"
            className={`player-bar__play ${isPlaying ? 'active' : 'not-active'}`}
            onClick={togglePlay}
            disabled={!currentTrack}
            aria-label={isPlaying ? 'Mettre en pause' : 'Lecture'}
          >
            <i
              className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'} fa-fw`}
              aria-hidden
            />
          </button>
          <button
            type="button"
            onClick={playNext}
            disabled={!currentTrack}
            aria-label="Morceau suivant"
          >
            <i className="fa-solid fa-forward-step" aria-hidden />
          </button>
        </div>
      </div>

      <div className="player-bar__extras">
        <div aria-hidden className="player-bar__time">
          {formatTime(progress)} / {formatTime(friendlyDuration)}
        </div>
        <div className="player-bar__volume">
          <i
            className={`fa-solid ${
              volume === 0 ? 'fa-volume-xmark' : volume > 0.5 ? 'fa-volume-high' : 'fa-volume-low'
            }`}
            aria-hidden
          />
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(volume * 100)}
            onChange={(event) => handleVolume(Number(event.target.value))}
          />
        </div>
        <button
          type="button"
          className="player-bar__embed-toggle"
          onClick={cycleYoutubeEmbedMode}
          title={embedButtonTitle}
          aria-label={`Changer la position de la video YouTube (${embedModeInfo.label})`}
        >
          <i className={`fa-solid ${embedModeInfo.icon}`} aria-hidden />
        </button>
        {currentTrack?.sources.youtubeId && (
          <a
            className="player-bar__open"
            href={`https://www.youtube.com/watch?v=${currentTrack.sources.youtubeId}`}
            target="_blank"
            rel="noreferrer"
          >
            <i className={`fa-solid fa-external-link`} aria-hidden />
          </a>
        )}
      </div>

    </footer>
  );
}

export default PlayerBar;
