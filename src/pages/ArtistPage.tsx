import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

import { TrackList } from '../components/Library/TrackList';
import { useLibraryStore } from '../stores/libraryStore';

import './ArtistPage.scss';

const SOCIAL_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  twitch: 'Twitch',
  twitter: 'X/Twitter',
  tiktok: 'TikTok',
  website: 'Site web',
};

export function ArtistPage() {
  const params = useParams();
  const artist = useLibraryStore((state) =>
    params.artistId ? state.getArtistById(params.artistId) : undefined,
  );
  const tracks = useLibraryStore((state) =>
    params.artistId ? state.getTracksByArtist(params.artistId) : [],
  );

  const socials = useMemo(() => {
    if (!artist?.socials) {
      return [];
    }
    return Object.entries(artist.socials)
      .filter((entry): entry is [string, string] => Boolean(entry[1]))
      .map(([key, url]) => ({
        key,
        url,
        label: SOCIAL_LABELS[key] ?? key,
      }));
  }, [artist]);

  if (!artist) {
    return (
      <div className="page artist-page">
        <div className="artist-page__empty">
          <h1>Artiste introuvable</h1>
          <p>Impossible de trouver cet artiste dans la bibliothèque locale.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page artist-page">
      <header className="artist-header">
        <div className="artist-header__visual" aria-hidden>
          {artist.bannerUrl ? (
            <img src={artist.bannerUrl} alt="" />
          ) : (
            <span>{artist.name.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="artist-header__content">
          <p className="artist-header__eyebrow">Artiste</p>
          <h1>{artist.name}</h1>
          {artist.bio && <p className="artist-header__bio">{artist.bio}</p>}
          <div className="artist-header__meta">
            {artist.debutYear && <span>Actif depuis {artist.debutYear}</span>}
            {artist.tags && artist.tags.length > 0 && (
              <span>{artist.tags.slice(0, 3).join(' · ')}</span>
            )}
          </div>
          {socials.length > 0 && (
            <div className="artist-header__socials">
              {socials.map((social) => (
                <a key={social.key} href={social.url} target="_blank" rel="noreferrer">
                  ↗ {social.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </header>

      <section className="artist-section">
        <h2>Pistes</h2>
        <TrackList tracks={tracks} />
      </section>
    </div>
  );
}
