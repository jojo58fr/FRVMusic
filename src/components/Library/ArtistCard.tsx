import { Link } from 'react-router-dom';

import type { Artist } from '../../types/library';

import './ArtistCard.scss';

type ArtistCardProps = {
  artist: Artist;
};

export function ArtistCard({ artist }: ArtistCardProps) {
  return (
    <Link to={`/artist/${artist.id}`} className="artist-card">
      <div className="artist-card__avatar" aria-hidden>
        {artist.avatarUrl ? (
          <img src={artist.avatarUrl} alt="" loading="lazy" />
        ) : (
          <span>{artist.name.slice(0, 2).toUpperCase()}</span>
        )}
      </div>
      <div className="artist-card__details">
        <p className="artist-card__name">{artist.name}</p>
        {artist.tags && artist.tags.length > 0 && (
          <p className="artist-card__tags">{artist.tags.slice(0, 2).join(' · ')}</p>
        )}
        {artist.debutYear && (
          <p className="artist-card__debut">Depuis {artist.debutYear}</p>
        )}
      </div>
    </Link>
  );
}
