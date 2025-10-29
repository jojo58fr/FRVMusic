export interface Artist {
  id: string;
  name: string;
  slug: string;
  bio?: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  debutYear?: number;
  tags?: string[];
  socials?: Partial<Record<'youtube' | 'twitch' | 'twitter' | 'tiktok' | 'website', string>>;
}

export interface TrackSource {
  youtubeId?: string;
  audioUrl?: string;
}

export interface Track {
  id: string;
  title: string;
  artistId: string;
  duration: number;
  releaseDate?: string;
  coverUrl?: string | null;
  description?: string;
  sources: TrackSource;
  tags?: string[];
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  trackIds: string[];
  createdAt: string;
  updatedAt: string;
  isReadOnly?: boolean;
}
