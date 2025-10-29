import { create } from 'zustand';

import artistsData from '../data/artists.json' assert { type: 'json' };
import tracksData from '../data/tracks.json' assert { type: 'json' };
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
  getArtistById: (artistId: string) => Artist | undefined;
  getTrackById: (trackId: string) => Track | undefined;
  getTracksByArtist: (artistId: string) => Track[];
  search: (term: string) => LibrarySearchResult;
}

const coerceArtists = artistsData as Artist[];
const coerceTracks = tracksData as Track[];

const indexById = <T extends { id: string }>(collection: T[]): Record<string, T> =>
  collection.reduce<Record<string, T>>((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

export const useLibraryStore = create<LibraryState>(() => {
  const artistsById = indexById(coerceArtists);
  const tracksById = indexById(coerceTracks);

  return {
    artists: coerceArtists,
    tracks: coerceTracks,
    artistsById,
    tracksById,
    getArtistById: (artistId) => artistsById[artistId],
    getTrackById: (trackId) => tracksById[trackId],
    getTracksByArtist: (artistId) =>
      coerceTracks.filter((track) => track.artistId === artistId),
    search: (term) => {
      if (!term.trim()) {
        return { artists: coerceArtists, tracks: coerceTracks };
      }

      const normalized = term.trim().toLowerCase();

      const artists = coerceArtists.filter((artist) => {
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

      const tracks = coerceTracks.filter((track) => {
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

      return { artists, tracks };
    },
  };
});
