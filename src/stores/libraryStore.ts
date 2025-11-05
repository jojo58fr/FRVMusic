import { create } from 'zustand';

import { fetchLibraryData } from '../services/libraryApi';
import type { Artist, Track } from '../types/library';

type LibrarySearchResult = {
  artists: Artist[];
  tracks: Track[];
};

interface LibraryState {
  artists: Artist[];
  tracks: Track[];
  artistsById: Record<string, Artist>;
  tracksById: Record<string, Track>;
  loading: boolean;
  error?: string;
  fetchCatalog: () => Promise<void>;
  getArtistById: (artistId: string) => Artist | undefined;
  getTrackById: (trackId: string) => Track | undefined;
  getTracksByArtist: (artistId: string) => Track[];
  search: (term: string) => LibrarySearchResult;
}

const indexById = <T extends { id: string }>(collection: T[]): Record<string, T> =>
  collection.reduce<Record<string, T>>((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

export const useLibraryStore = create<LibraryState>((set, get) => {
  const fetchCatalog = async () => {
    const state = get();
    if (state.loading) {
      return;
    }

    set({ loading: true, error: undefined });

    try {
      const { artists, tracks } = await fetchLibraryData();
      const artistsById = indexById(artists);
      const tracksById = indexById(tracks);

      set({
        artists,
        tracks,
        artistsById,
        tracksById,
        loading: false,
        error: undefined,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Impossible de charger la bibliothèque.';
      set({ loading: false, error: message });
    }
  };

  const getArtistById = (artistId: string) => get().artistsById[artistId];
  const getTrackById = (trackId: string) => get().tracksById[trackId];
  const getTracksByArtist = (artistId: string) =>
    get().tracks.filter((track) => track.artistId === artistId);

  const search = (term: string) => {
    const { artists, tracks, artistsById } = get();
    if (!term.trim()) {
      return { artists, tracks };
    }

    const normalized = term.trim().toLowerCase();

    const matchingArtists = artists.filter((artist) => {
      const haystack = [
        artist.name,
        artist.slug,
        artist.bio,
        ...(artist.tags ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalized);
    });

    const matchingTracks = tracks.filter((track) => {
      const haystack = [
        track.title,
        track.description,
        ...(track.tags ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (haystack.includes(normalized)) {
        return true;
      }

      const artist = artistsById[track.artistId];
      return artist?.name.toLowerCase().includes(normalized);
    });

    return { artists: matchingArtists, tracks: matchingTracks };
  };

  const initialState: LibraryState = {
    artists: [],
    tracks: [],
    artistsById: {},
    tracksById: {},
    loading: false,
    error: undefined,
    fetchCatalog,
    getArtistById,
    getTrackById,
    getTracksByArtist,
    search,
  };

  return initialState;
});

void useLibraryStore.getState().fetchCatalog();
