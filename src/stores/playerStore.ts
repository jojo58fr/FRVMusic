import { create } from 'zustand';

interface PlayerState {
  queue: string[];
  history: string[];
  currentIndex: number;
  isPlaying: boolean;
  progress: number;
  duration: number;
  setQueue: (trackIds: string[], startTrackId?: string) => void;
  playTrack: (trackId: string, queue?: string[]) => void;
  togglePlay: () => void;
  setIsPlaying: (playing: boolean) => void;
  playNext: () => void;
  playPrevious: () => void;
  setProgress: (seconds: number) => void;
  setDuration: (seconds: number) => void;
  seekToIndex: (index: number) => void;
  reset: () => void;
}

const clampIndex = (queue: string[], index: number) => {
  if (queue.length === 0) {
    return -1;
  }
  if (index < 0) {
    return queue.length - 1;
  }
  if (index >= queue.length) {
    return 0;
  }
  return index;
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [],
  history: [],
  currentIndex: -1,
  isPlaying: false,
  progress: 0,
  duration: 0,
  setQueue: (trackIds, startTrackId) => {
    const queue = [...new Set(trackIds)];
    const startingIndex =
      startTrackId && queue.includes(startTrackId)
        ? queue.indexOf(startTrackId)
        : queue.length > 0
          ? 0
          : -1;

    set({
      queue,
      currentIndex: startingIndex,
      history: [],
      isPlaying: startingIndex !== -1,
      progress: 0,
      duration: 0,
    });
  },
  playTrack: (trackId, queue) => {
    if (queue && queue.length > 0) {
      get().setQueue(queue, trackId);
      return;
    }

    set((state) => {
      const existingIndex = state.queue.indexOf(trackId);
      if (existingIndex !== -1) {
        return {
          currentIndex: existingIndex,
          isPlaying: true,
          progress: 0,
        };
      }

      return {
        queue: [...state.queue, trackId],
        currentIndex: state.queue.length,
        isPlaying: true,
        progress: 0,
      };
    });
  },
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  playNext: () => {
    const state = get();
    if (state.queue.length === 0) {
      return;
    }

    const nextIndex = clampIndex(state.queue, state.currentIndex + 1);
    set((prev) => ({
      currentIndex: nextIndex,
      history:
        prev.currentIndex !== -1
          ? [...prev.history, prev.queue[prev.currentIndex]]
          : prev.history,
      progress: 0,
      isPlaying: true,
    }));
  },
  playPrevious: () => {
    const state = get();
    if (state.queue.length === 0) {
      return;
    }

    const previousIndex = clampIndex(state.queue, state.currentIndex - 1);
    set({
      currentIndex: previousIndex,
      progress: 0,
      isPlaying: true,
    });
  },
  setProgress: (seconds) => set({ progress: seconds }),
  setDuration: (seconds) => set({ duration: seconds }),
  seekToIndex: (index) => {
    const { queue } = get();
    if (index < 0 || index >= queue.length) {
      return;
    }
    set({
      currentIndex: index,
      progress: 0,
      isPlaying: true,
    });
  },
  reset: () =>
    set({
      queue: [],
      history: [],
      currentIndex: -1,
      isPlaying: false,
      progress: 0,
      duration: 0,
    }),
}));
