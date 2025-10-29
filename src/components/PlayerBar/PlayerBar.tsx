import { useEffect, useMemo, useRef, useState } from 'react';
import type { SyntheticEvent } from 'react';
import ReactPlayer from 'react-player';

import { useLibraryStore } from '../../stores/libraryStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useUserStore } from '../../stores/userStore';
import { fetchYouTubeVideo, isYouTubeApiConfigured } from '../../services/youtube';
import type { YouTubeVideoDetails } from '../../types/youtube';
import { formatCompactNumber } from '../../utils/formatNumber';
import { formatTime } from '../../utils/formatTime';

import './PlayerBar.scss';

type YoutubeInternalPlayer = HTMLVideoElement & {
  seekTo?: (amount: number, type?: 'seconds' | 'fraction') => void;
};

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

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const youtubePlayerRef = useRef<YoutubeInternalPlayer | null>(null);
  const [youtubeDetails, setYoutubeDetails] = useState<YouTubeVideoDetails | null>(null);
  const [isFetchingYoutube, setIsFetchingYoutube] = useState(false);

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

  const isYoutubeApiAvailable = useMemo(() => isYouTubeApiConfigured(), []);

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
    const youtubeId = currentTrack?.sources.youtubeId;
    if (!youtubeId || !isYoutubeApiAvailable) {
      setYoutubeDetails(null);
      setIsFetchingYoutube(false);
      return;
    }

    let cancelled = false;
    const loadDetails = async () => {
      setIsFetchingYoutube(true);
      try {
        const details = await fetchYouTubeVideo(youtubeId);
        if (!cancelled) {
          setYoutubeDetails(details ?? null);
        }
      } catch (_error) {
        if (!cancelled) {
          setYoutubeDetails(null);
        }
      } finally {
        if (!cancelled) {
          setIsFetchingYoutube(false);
        }
      }
    };

    loadDetails();

    return () => {
      cancelled = true;
    };
  }, [currentTrack?.sources.youtubeId, isYoutubeApiAvailable]);

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

  const seekYoutubeTo = (seconds: number) => {
    const player = youtubePlayerRef.current;
    if (!player) {
      return;
    }
    if (typeof player.seekTo === 'function') {
      player.seekTo(seconds, 'seconds');
    } else {
      player.currentTime = seconds;
    }
  };

  const handleYouTubeReady = () => {
    seekYoutubeTo(0);
  };

  const handleYouTubeTimeUpdate = (event: SyntheticEvent<HTMLVideoElement>) => {
    const current = event.currentTarget.currentTime;
    if (Number.isFinite(current)) {
      setProgress(current);
    }
  };

  const handleYouTubeDurationChange = (event: SyntheticEvent<HTMLVideoElement>) => {
    const total = event.currentTarget.duration;
    if (Number.isFinite(total)) {
      setDuration(total);
    }
  };

  const handleYouTubeEnded = () => {
    playNext();
  };

  const handleYouTubeError = (error: unknown) => {
    console.warn('[YouTube] player error', error);
    setIsPlaying(false);
  };

  const handleSeek = (value: number) => {
    setProgress(value);
    if (playbackType === 'audio' && audioRef.current) {
      audioRef.current.currentTime = value;
    } else if (playbackType === 'youtube') {
      seekYoutubeTo(value);
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
  const displayTitle =
    (isYoutubeTrack && youtubeDetails?.channelTitle) ||
    currentTrack?.title ||
    'Titre indisponible';
  const displaySubtitle = (() => {
    if (!currentTrack) {
      return '';
    }
    if (isYoutubeTrack) {
      if (currentTrack.title && currentTrack.title !== displayTitle) {
        return currentTrack.title;
      }
      return '';
    }
    return currentArtist ? currentArtist.name : 'Artiste inconnu';
  })();
  
  let youtubeInfoText = '';
  if (youtubeDetails)
    youtubeInfoText = `${formatCompactNumber(youtubeDetails?.viewCount)} vues`;

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
              <span>{displayTitle.slice(0, 2).toUpperCase()}</span>
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
            Sélectionne un morceau pour commencer la lecture.
          </p>
        )}
      </div>

      <div className="player-bar__controls">
        <div className="player-bar__buttons">
          <button
            type="button"
            onClick={playPrevious}
            disabled={!currentTrack}
            aria-label="Morceau précédent"
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
        {isYoutubeApiAvailable &&
          (youtubeDetails ? (
            <span
              className="player-bar__youtube-info"
              title={youtubeInfoText ?? undefined}
              aria-label={youtubeInfoText ?? 'Informations YouTube'}
            >
              <i className="fa-solid fa-circle-info" aria-hidden />
            </span>
          ) : (
            isFetchingYoutube && (
              <span
                className="player-bar__youtube-info player-bar__youtube-info--loading"
                aria-live="polite"
              >
                <i className="fa-solid fa-spinner fa-spin" aria-hidden />
              </span>
            )
          ))}
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

      {currentTrack?.sources.youtubeId && (
        <div className="player-bar__youtube">
          <ReactPlayer
            ref={youtubePlayerRef}
            src={`https://www.youtube.com/watch?v=${currentTrack.sources.youtubeId}`}
            playing={playbackType === 'youtube' ? isPlaying : false}
            volume={volume}
            muted={volume === 0}
            controls={false}
            playsInline
            onReady={handleYouTubeReady}
            onTimeUpdate={handleYouTubeTimeUpdate}
            onDurationChange={handleYouTubeDurationChange}
            onEnded={handleYouTubeEnded}
            onError={handleYouTubeError}
            width={0}
            height={0}
            style={{ display: 'none' }}
          />
        </div>
      )}
    </footer>
  );
}

export default PlayerBar;
