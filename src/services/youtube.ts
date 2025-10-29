import { gapi } from 'gapi-script';

import type { YouTubeVideoDetails } from '../types/youtube';

type GapiClientWithInit = typeof gapi.client & {
  init: (args: { apiKey: string; discoveryDocs: string[] }) => PromiseLike<void>;
};

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

const DISCOVERY_DOCS = [
  'https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest',
];

let clientPromise: Promise<void> | null = null;

const ensureClient = async () => {
  if (!API_KEY) {
    throw new Error('YouTube API key missing (VITE_YOUTUBE_API_KEY).');
  }

  if (!clientPromise) {
    clientPromise = new Promise<void>((resolve, reject) => {
      gapi.load('client', async () => {
        try {
          await (gapi.client as GapiClientWithInit).init({
            apiKey: API_KEY,
            discoveryDocs: DISCOVERY_DOCS,
          });
          resolve();
        } catch (error) {
          reject(error as Error);
        }
      });
    });
  }

  return clientPromise;
};

const toNumber = (value?: string | null) =>
  value ? Number(value) : undefined;

export const fetchYouTubeVideos = async (
  ids: string[],
): Promise<YouTubeVideoDetails[]> => {
  if (ids.length === 0) {
    return [];
  }

  await ensureClient();

  const response = await gapi.client.youtube.videos.list({
    id: ids.slice(0, 50).join(','),
    part: ['snippet', 'contentDetails', 'statistics'],
  });

  const items = (response.result.items ?? []) as gapi.client.youtube.Video[];

  return items.map((item) => ({
    id: item.id ?? '',
    title: item.snippet?.title ?? '',
    channelTitle: item.snippet?.channelTitle ?? '',
    publishedAt: item.snippet?.publishedAt ?? undefined,
    viewCount: toNumber(item.statistics?.viewCount),
    likeCount: toNumber(item.statistics?.likeCount),
    duration: item.contentDetails?.duration ?? undefined,
    thumbnailUrl:
      item.snippet?.thumbnails?.high?.url ??
      item.snippet?.thumbnails?.default?.url,
  }));
};

export const fetchYouTubeVideo = async (
  id: string,
): Promise<YouTubeVideoDetails | undefined> => {
  const [video] = await fetchYouTubeVideos([id]);
  return video;
};

export const isYouTubeApiConfigured = () => Boolean(API_KEY);
