type YoutubeApi = typeof window.YT;

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string | HTMLElement,
        options: {
          videoId: string;
          playerVars?: Record<string, unknown>;
          events?: {
            onReady?: (event: { target: YoutubePlayer }) => void;
            onStateChange?: (event: YoutubeStateChangeEvent) => void;
            onError?: (event: { data: number }) => void;
          };
        },
      ) => YoutubePlayer;
      PlayerState: {
        UNSTARTED: -1;
        ENDED: 0;
        PLAYING: 1;
        PAUSED: 2;
        BUFFERING: 3;
        CUED: 5;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export type YoutubePlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  loadVideoById: (videoId: string | { videoId: string }) => void;
  cueVideoById: (videoId: string | { videoId: string }) => void;
  getDuration: () => number;
  getCurrentTime: () => number;
  setVolume: (volume: number) => void;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  destroy: () => void;
};

export type YoutubeStateChangeEvent = {
  data: number;
  target: YoutubePlayer;
};

let loadPromise: Promise<YoutubeApi> | null = null;

export const loadYoutubeIframeApi = (): Promise<YoutubeApi> => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('window is undefined'));
  }

  if (window.YT && window.YT.Player) {
    return Promise.resolve(window.YT);
  }

  if (!loadPromise) {
    loadPromise = new Promise<YoutubeApi>((resolve, reject) => {
      const handleReady = () => {
        if (window.YT && window.YT.Player) {
          resolve(window.YT);
        } else {
          reject(new Error('YouTube API did not initialize correctly'));
        }
      };

      const existingScript = document.getElementById('youtube-iframe-api');
      if (existingScript) {
        window.onYouTubeIframeAPIReady = handleReady;
        return;
      }

      const script = document.createElement('script');
      script.id = 'youtube-iframe-api';
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => {
        reject(new Error('Cannot load YouTube iframe API'));
      };

      window.onYouTubeIframeAPIReady = handleReady;
      document.head.appendChild(script);
    });
  }

  return loadPromise;
};
