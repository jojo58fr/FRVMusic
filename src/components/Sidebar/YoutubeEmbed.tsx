import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useLibraryStore } from '../../stores/libraryStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useUserStore } from '../../stores/userStore';
import { registerYoutubeSeekHandler } from '../../utils/youtubeController';
import {
  loadYoutubeIframeApi,
  type YoutubePlayer,
  type YoutubeStateChangeEvent,
} from '../../utils/youtubeIframeApi';

const PROGRESS_INTERVAL_MS = 500;

export function SidebarYoutubeEmbed() {
  const {
    queue,
    currentIndex,
    isPlaying,
    playNext,
    setIsPlaying,
    setProgress,
    setDuration,
  } = usePlayerStore((state) => state);

  const tracksById = useLibraryStore((state) => state.tracksById);
  const volume = useUserStore((state) => state.volume);
  const embedMode = useUserStore((state) => state.youtubeEmbedMode);
  const isFullscreenBackground = useUserStore((state) => state.isFullscreenBackground);
  const setIsFullscreenBackground = useUserStore((state) => state.setIsFullscreenBackground);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YoutubePlayer | null>(null);
  const readyRef = useRef(false);
  const progressTimerRef = useRef<number | null>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const desiredPlayStateRef = useRef(isPlaying);
  const volumeRef = useRef(volume);
  const loadedVideoIdRef = useRef<string | undefined>(undefined);

  const dockElementRef = useRef<HTMLElement | null>(null);
  const fullscreenPointerMoveRef = useRef<((event: PointerEvent) => void) | null>(null);
  const [sidebarHost, setSidebarHost] = useState<HTMLElement | null>(null);
  const sidebarHostRef = useCallback((node: HTMLDivElement | null) => {
    setSidebarHost(node ?? null);
  }, []);

  const currentTrackId =
    currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : undefined;
  const youtubeId = currentTrackId ? tracksById[currentTrackId]?.sources.youtubeId : undefined;

  function stopProgressTimer() {
    if (progressTimerRef.current !== null) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }

  function startProgressTimer() {
    stopProgressTimer();
    progressTimerRef.current = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) {
        return;
      }
      const current = player.getCurrentTime();
      if (Number.isFinite(current)) {
        setProgress(current);
      }
      const duration = player.getDuration();
      if (Number.isFinite(duration)) {
        setDuration(duration);
      }
    }, PROGRESS_INTERVAL_MS);
  }

  function applyVolume(player: YoutubePlayer, value: number) {
    const clamped = Math.max(0, Math.min(1, value));
    try {
      player.setVolume(clamped * 100);
    } catch {
      // ignored: setter may not exist yet depending on readiness
    }
    if (clamped === 0) {
      try {
        player.mute();
      } catch {
        // ignore mute failure
      }
      return;
    }
    try {
      if (typeof player.isMuted === 'function' && player.isMuted()) {
        player.unMute();
      } else {
        player.unMute();
      }
    } catch {
      // ignore unmute failure
    }
  }

  function syncDuration(player: YoutubePlayer) {
    const duration = player.getDuration();
    if (Number.isFinite(duration)) {
      setDuration(duration);
    }
  }

  function applyPendingSeek(player: YoutubePlayer) {
    if (pendingSeekRef.current === null) {
      return;
    }
    const target = Math.max(0, pendingSeekRef.current);
    pendingSeekRef.current = null;
    try {
      player.seekTo(target, true);
      setProgress(target);
    } catch (error) {
      console.warn('[YouTube] seek failed', error);
    }
  }

  function destroyPlayer() {
    stopProgressTimer();
    readyRef.current = false;
    const player = playerRef.current;
    if (player) {
      try {
        player.destroy();
      } catch {
        // ignore destroy failure
      }
      playerRef.current = null;
      loadedVideoIdRef.current = undefined;
    }
  }

  const disableFullscreenBackground = () => {
    if (fullscreenPointerMoveRef.current) {
      window.removeEventListener('pointermove', fullscreenPointerMoveRef.current);
      fullscreenPointerMoveRef.current = null;
    }
    setIsFullscreenBackground(false);
  };

  const enableFullscreenBackground = () => {
    if (embedMode !== 'fullscreen') {
      return;
    }
    setIsFullscreenBackground(true);

    if (fullscreenPointerMoveRef.current) {
      return;
    }

    const handleMove = (event: PointerEvent) => {
      const dock = dockElementRef.current;
      if (!dock) {
        disableFullscreenBackground();
        return;
      }
      const rect = dock.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      ) {
        disableFullscreenBackground();
      }
    };

    fullscreenPointerMoveRef.current = handleMove;
    window.addEventListener('pointermove', handleMove);
  };

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    desiredPlayStateRef.current = isPlaying;
    const player = playerRef.current;
    if (!player || !readyRef.current) {
      return;
    }
    try {
      if (isPlaying) {
        player.playVideo();
        startProgressTimer();
      } else {
        player.pauseVideo();
        stopProgressTimer();
      }
    } catch (error) {
      console.warn('[YouTube] failed to toggle playback', error);
    }
  }, [isPlaying]);

  useEffect(() => {
    const handler = youtubeId
      ? (seconds: number) => {
          const player = playerRef.current;
          if (player && readyRef.current) {
            try {
              player.seekTo(seconds, true);
              setProgress(seconds);
            } catch (error) {
              console.warn('[YouTube] seek failed', error);
            }
            pendingSeekRef.current = null;
          } else {
            pendingSeekRef.current = seconds;
          }
        }
      : null;

    registerYoutubeSeekHandler(handler);
    return () => registerYoutubeSeekHandler(null);
  }, [setProgress, youtubeId]);

  useEffect(() => {
    if (!youtubeId) {
      stopProgressTimer();
      pendingSeekRef.current = null;
      readyRef.current = false;
      setDuration(0);
      loadedVideoIdRef.current = undefined;
      return;
    }

    let isCancelled = false;
    const isNewVideo = youtubeId !== loadedVideoIdRef.current;
    if (isNewVideo) {
      setProgress(0);
      setDuration(0);
    }

    const initialise = async () => {
      try {
        const YT = await loadYoutubeIframeApi();
        if (isCancelled) {
          return;
        }

        const existing = playerRef.current;
        const container = containerRef.current;

        if (existing && container) {
          const iframe =
            typeof existing.getIframe === 'function' ? existing.getIframe() : null;
          if (iframe && iframe.parentElement !== container) {
            container.innerHTML = '';
            container.appendChild(iframe);
          }

          if (isNewVideo) {
            try {
              if (desiredPlayStateRef.current) {
                existing.loadVideoById({ videoId: youtubeId });
              } else if (typeof existing.cueVideoById === 'function') {
                existing.cueVideoById({ videoId: youtubeId });
              } else {
                existing.loadVideoById({ videoId: youtubeId });
                existing.pauseVideo();
              }
            } catch (error) {
              console.warn('[YouTube] failed to load video', error);
            }
            loadedVideoIdRef.current = youtubeId;
          }

          applyPendingSeek(existing);
          applyVolume(existing, volumeRef.current);
          syncDuration(existing);
          if (desiredPlayStateRef.current) {
            startProgressTimer();
          } else {
            stopProgressTimer();
          }
          return;
        }

        if (!container) {
          return;
        }
        container.innerHTML = '';
        loadedVideoIdRef.current = youtubeId;

        playerRef.current = new YT.Player(container, {
          videoId: youtubeId,
          playerVars: {
            autoplay: desiredPlayStateRef.current ? 1 : 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            mute: volumeRef.current === 0 ? 1 : 0,
          },
          events: {
            onReady: (event) => {
              if (isCancelled) {
                return;
              }
              readyRef.current = true;
              const player = event.target;
              playerRef.current = player;
              loadedVideoIdRef.current = youtubeId;
              applyVolume(player, volumeRef.current);
              syncDuration(player);
              applyPendingSeek(player);
              if (desiredPlayStateRef.current) {
                try {
                  player.playVideo();
                  startProgressTimer();
                } catch (error) {
                  console.warn('[YouTube] autoplay rejected', error);
                }
              } else {
                player.pauseVideo();
                stopProgressTimer();
              }
            },
            onStateChange: (event: YoutubeStateChangeEvent) => {
              if (isCancelled) {
                return;
              }
              const { data, target } = event;
              const playerState = window.YT?.PlayerState;
              if (!playerState) {
                return;
              }
              if (data === playerState.ENDED) {
                stopProgressTimer();
                setProgress(target.getDuration());
                setIsPlaying(false);
                playNext();
                return;
              }
              if (data === playerState.PLAYING) {
                readyRef.current = true;
                setIsPlaying(true);
                syncDuration(target);
                startProgressTimer();
                return;
              }
              if (data === playerState.PAUSED) {
                setIsPlaying(false);
                stopProgressTimer();
                setProgress(target.getCurrentTime());
                return;
              }
              if (data === playerState.CUED) {
                setProgress(target.getCurrentTime());
              }
            },
            onError: (error) => {
              if (isCancelled) {
                return;
              }
              console.warn('[YouTube] player error', error);
              setIsPlaying(false);
              stopProgressTimer();
            },
          },
        });
      } catch (error) {
        if (!isCancelled) {
          console.warn('[YouTube] failed to initialise player', error);
          setIsPlaying(false);
        }
      }
    };

    void initialise();

    return () => {
      isCancelled = true;
    };
  }, [playNext, setDuration, setIsPlaying, setProgress, youtubeId, embedMode]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player || !readyRef.current) {
      return;
    }
    applyVolume(player, volume);
  }, [volume]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const dock = document.getElementById('youtube-embed-dock');
    const main = document.querySelector('.app-shell__main') as HTMLElement | null;

    dockElementRef.current = dock;

    if (!dock || !main) {
      return () => {
        dockElementRef.current = null;
        disableFullscreenBackground();
      };
    }

    const handleDockEnter = () => {
      console.log("handleDockEnter");

      if (embedMode === 'fullscreen' && youtubeId) {
        enableFullscreenBackground();
      }
    };

    const handleMainLeave = () => {
      console.log("handleMainLeave");
       
      disableFullscreenBackground();
    };

    main.addEventListener('pointerenter', handleDockEnter);
    main.addEventListener('pointerleave', handleMainLeave);

    return () => {
      main.removeEventListener('pointerenter', handleDockEnter);
      main.removeEventListener('pointerleave', handleMainLeave);
      dockElementRef.current = null;
      disableFullscreenBackground();
    };
  }, [embedMode, youtubeId]);

  useEffect(() => {
    if (embedMode !== 'fullscreen') {
      disableFullscreenBackground();
    }
  }, [embedMode]);

  useEffect(() => {
    if (!youtubeId) {
      disableFullscreenBackground();
    }
  }, [youtubeId]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const dock = document.getElementById('youtube-embed-dock');
    if (!dock) {
      return;
    }

    const isActive = Boolean(youtubeId) && embedMode !== 'sidebar';
    const isFullscreenMode = isActive && embedMode === 'fullscreen';

    dock.classList.toggle('app-shell__embed-dock--active', isActive);
    dock.classList.toggle('app-shell__embed-dock--fullscreen', isFullscreenMode);
    dock.classList.toggle(
      'app-shell__embed-dock--background',
      isFullscreenMode && isFullscreenBackground,
    );

    return () => {
      dock.classList.remove(
        'app-shell__embed-dock--active',
        'app-shell__embed-dock--fullscreen',
        'app-shell__embed-dock--background',
      );
    };
  }, [embedMode, isFullscreenBackground, youtubeId]);

  useEffect(() => {
    return () => {
      disableFullscreenBackground();
    };
  }, []);

  useEffect(() => destroyPlayer, []);

  const modeClassMap = {
    sidebar: 'sidebar__embed--mode-sidebar',
    fullscreen: 'sidebar__embed--mode-fullscreen',
    hidden: 'sidebar__embed--mode-hidden',
    'bottom-right': 'sidebar__embed--mode-bottom-right',
    'top-left': 'sidebar__embed--mode-top-left',
  } as const;

  const embedClassName = [
    'sidebar__embed',
    modeClassMap[embedMode] ?? '',
    embedMode === 'fullscreen' && isFullscreenBackground ? 'sidebar__embed--background' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const playerClassName = [
    'sidebar__embed-player',
    embedMode === 'fullscreen' ? 'sidebar__embed-player--fullscreen' : '',
    embedMode === 'bottom-right' || embedMode === 'top-left'
      ? 'sidebar__embed-player--floating'
      : '',
    embedMode === 'hidden' ? 'sidebar__embed-player--hidden' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const embedMarkup = youtubeId ? (
    <div className={embedClassName} data-embed-mode={embedMode} aria-hidden={embedMode === 'hidden'}>
      <div className={playerClassName}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  ) : null;

  const dock =
    typeof document !== 'undefined' ? document.getElementById('youtube-embed-dock') : null;
  const target = embedMode === 'sidebar' ? sidebarHost : dock;

  return (
    <>
      <div ref={sidebarHostRef} className="sidebar__embed-anchor" />
      {youtubeId && embedMarkup && target ? createPortal(embedMarkup, target) : null}
    </>
  );
}
