import type { Artist, Track } from '../types/library';

const DEFAULT_API_BASE_URL = 'https://api-frvmusic.frvtubers.com/api';
const API_BASE_URL =
  (import.meta.env.VITE_FRVMUSIC_API_BASE_URL as string | undefined) ??
  DEFAULT_API_BASE_URL;

type ThumbnailValue = string | { url?: string | null } | null | undefined;

type CatalogThumbnails = {
  default?: ThumbnailValue;
  medium?: ThumbnailValue;
  high?: ThumbnailValue;
  standard?: ThumbnailValue;
  maxres?: ThumbnailValue;
};

type CatalogVideo = {
  id: string;
  url?: string;
  title?: string | null;
  description?: string | null;
  channelId?: string | null;
  channelTitle?: string | null;
  thumbnails?: CatalogThumbnails | null;
  durationSeconds?: number | null;
  durationIso8601?: string | null;
  publishedAt?: string | null;
  status?: string | null;
  embeddable?: boolean | null;
};

type CatalogChannel = {
  id: string;
  url?: string | null;
  title?: string | null;
  description?: string | null;
  customUrl?: string | null;
  country?: string | null;
  thumbnails?: CatalogThumbnails | null;
};

const pickThumbnailUrl = (thumbnails?: CatalogThumbnails | null): string | undefined => {
  if (!thumbnails) {
    return undefined;
  }

  const order: Array<keyof CatalogThumbnails> = [
    'maxres',
    'high',
    'standard',
    'medium',
    'default',
  ];

  for (const key of order) {
    const value = thumbnails[key];
    if (!value) {
      continue;
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'object' && value !== null && 'url' in value && value.url) {
      return value.url;
    }
  }

  return undefined;
};

const toPlainString = (value?: string | null): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const stripAt = (value?: string | null) =>
  value ? value.replace(/^@+/, '').trim() : undefined;

const slugify = (value: string): string => {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || value.toLowerCase().replace(/\s+/g, '-');
};

const parseIsoDuration = (value?: string | null): number | undefined => {
  if (!value) {
    return undefined;
  }

  const match = value.match(
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/,
  );

  if (!match) {
    return undefined;
  }

  const [, daysStr, hoursStr, minutesStr, secondsStr] = match;

  const days = daysStr ? Number(daysStr) * 86400 : 0;
  const hours = hoursStr ? Number(hoursStr) * 3600 : 0;
  const minutes = minutesStr ? Number(minutesStr) * 60 : 0;
  const seconds = secondsStr ? Number(secondsStr) : 0;

  return days + hours + minutes + seconds;
};

const safeDurationSeconds = (video: CatalogVideo): number => {
  const fromNumber =
    typeof video.durationSeconds === 'number' ? video.durationSeconds : undefined;
  if (Number.isFinite(fromNumber) && fromNumber !== undefined) {
    return Math.max(0, fromNumber);
  }

  const fromIso = parseIsoDuration(video.durationIso8601);
  if (Number.isFinite(fromIso) && fromIso !== undefined) {
    return Math.max(0, fromIso);
  }

  return 0;
};

const buildArtistFromChannel = (channel: CatalogChannel): Artist => {
  const name = toPlainString(channel.title) ?? channel.id;
  const customSlugSource = stripAt(channel.customUrl) ?? name;
  const avatar = pickThumbnailUrl(channel.thumbnails);

  return {
    id: channel.id,
    name,
    slug: slugify(customSlugSource || channel.id),
    bio: toPlainString(channel.description),
    avatarUrl: avatar ?? null,
    bannerUrl: null,
    debutYear: undefined,
    tags: channel.country ? [channel.country] : undefined,
    socials: channel.url ? { youtube: channel.url } : undefined,
  };
};

const buildFallbackArtist = (video: CatalogVideo, artistId: string): Artist => {
  const name = toPlainString(video.channelTitle) ?? artistId;
  const avatar = pickThumbnailUrl(video.thumbnails);

  return {
    id: artistId,
    name,
    slug: slugify(name),
    bio: undefined,
    avatarUrl: avatar ?? null,
    bannerUrl: null,
    debutYear: undefined,
    tags: undefined,
    socials: video.channelId
      ? { youtube: `https://www.youtube.com/channel/${video.channelId}` }
      : undefined,
  };
};

const buildTrackFromVideo = (video: CatalogVideo): Track => {
  const trackId = video.id;
  const artistId = toPlainString(video.channelId) ?? `unknown-${trackId}`;
  const cover = pickThumbnailUrl(video.thumbnails);

  return {
    id: trackId,
    title: toPlainString(video.title) ?? trackId,
    artistId,
    duration: safeDurationSeconds(video),
    releaseDate: toPlainString(video.publishedAt),
    coverUrl: cover ?? null,
    description: toPlainString(video.description),
    sources: {
      youtubeId: trackId,
    },
    tags: video.status ? [video.status] : undefined,
  };
};

const getJson = async <T>(input: RequestInfo, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, init);
  if (!response.ok) {
    const message = `Requete API echouee (${response.status})`;
    throw new Error(message);
  }
  return (await response.json()) as T;
};

export const fetchLibraryData = async (): Promise<{ artists: Artist[]; tracks: Track[] }> => {
  const videos = await getJson<CatalogVideo[]>(`${API_BASE_URL}/catalog/videos`, {
    cache: 'no-store',
  });

  let channels: CatalogChannel[] = [];
  try {
    channels = await getJson<CatalogChannel[]>(`${API_BASE_URL}/catalog/channels`, {
      cache: 'no-store',
    });
  } catch {
    channels = [];
  }

  const artistMap = new Map<string, Artist>();

  channels.forEach((channel) => {
    if (!channel.id) {
      return;
    }
    const artist = buildArtistFromChannel(channel);
    artistMap.set(artist.id, artist);
  });

  const tracks = videos
    .filter((video) => Boolean(video?.id))
    .map((video) => {
      const track = buildTrackFromVideo(video);
      if (!artistMap.has(track.artistId)) {
        const fallback = buildFallbackArtist(video, track.artistId);
        artistMap.set(fallback.id, fallback);
      }
      return track;
    });

  const artists = Array.from(artistMap.values());

  return { artists, tracks };
};
