import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Playlist } from '../types/library';

export type ThemeMode = 'light' | 'dark';

interface UserState {
  favorites: string[];
  playlists: Record<string, Playlist>;
  theme: ThemeMode;
  volume: number;
  lastTrackId?: string;
  toggleFavorite: (trackId: string) => void;
  isFavorite: (trackId: string) => boolean;
  createPlaylist: (name: string, description?: string) => Playlist;
  updatePlaylist: (playlistId: string, payload: Partial<Omit<Playlist, 'id'>>) => void;
  deletePlaylist: (playlistId: string) => void;
  addTrackToPlaylist: (playlistId: string, trackId: string) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  getPlaylist: (playlistId: string) => Playlist | undefined;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setVolume: (volume: number) => void;
  setLastTrackId: (trackId?: string) => void;
}

const nowIso = () => new Date().toISOString();

export const FAVORITES_PLAYLIST_ID = 'favorites';

const persistConfig = {
  name: 'frvmusic-user-store',
  version: 1,
  partialize: (state: UserState) => ({
    favorites: state.favorites,
    playlists: state.playlists,
    theme: state.theme,
    volume: state.volume,
    lastTrackId: state.lastTrackId,
  }),
};

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      favorites: [],
      playlists: {},
      theme: 'dark',
      volume: 0.8,
      lastTrackId: undefined,
      toggleFavorite: (trackId) => {
        set((state) => {
          const exists = state.favorites.includes(trackId);
          return {
            favorites: exists
              ? state.favorites.filter((id) => id !== trackId)
              : [...state.favorites, trackId],
            lastTrackId: exists ? state.lastTrackId : trackId,
          };
        });
      },
      isFavorite: (trackId) => get().favorites.includes(trackId),
      createPlaylist: (name, description) => {
        const id = crypto.randomUUID();
        const playlist: Playlist = {
          id,
          name,
          description,
          trackIds: [],
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };

        set((state) => ({
          playlists: {
            ...state.playlists,
            [id]: playlist,
          },
        }));

        return playlist;
      },
      updatePlaylist: (playlistId, payload) => {
        set((state) => {
          const target = state.playlists[playlistId];
          if (!target) {
            return state;
          }

          const updated: Playlist = {
            ...target,
            ...payload,
            updatedAt: nowIso(),
          };

          return {
            playlists: {
              ...state.playlists,
              [playlistId]: updated,
            },
          };
        });
      },
      deletePlaylist: (playlistId) =>
        set((state) => {
          if (!state.playlists[playlistId]) {
            return state;
          }
          const { [playlistId]: _removed, ...rest } = state.playlists;
          return { playlists: rest };
        }),
      addTrackToPlaylist: (playlistId, trackId) => {
        set((state) => {
          const target = state.playlists[playlistId];
          if (!target) {
            return state;
          }

          if (target.trackIds.includes(trackId)) {
            return state;
          }

          const updated: Playlist = {
            ...target,
            trackIds: [...target.trackIds, trackId],
            updatedAt: nowIso(),
          };

          return {
            playlists: {
              ...state.playlists,
              [playlistId]: updated,
            },
          };
        });
      },
      removeTrackFromPlaylist: (playlistId, trackId) => {
        set((state) => {
          const target = state.playlists[playlistId];
          if (!target) {
            return state;
          }

          const updated: Playlist = {
            ...target,
            trackIds: target.trackIds.filter((id) => id !== trackId),
            updatedAt: nowIso(),
          };

          return {
            playlists: {
              ...state.playlists,
              [playlistId]: updated,
            },
          };
        });
      },
      getPlaylist: (playlistId) => get().playlists[playlistId],
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setVolume: (volume) => set({ volume: Math.min(1, Math.max(0, volume)) }),
      setLastTrackId: (trackId) => set({ lastTrackId: trackId }),
    }),
    persistConfig,
  ),
);
