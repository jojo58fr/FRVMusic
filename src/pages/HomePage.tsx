import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import { ArtistCard } from '../components/Library/ArtistCard';
import { TrackList } from '../components/Library/TrackList';
import { useLibraryStore } from '../stores/libraryStore';
import { usePlayerStore } from '../stores/playerStore';
import { useUserStore } from '../stores/userStore';

import './HomePage.scss';

export function HomePage() {
  const artists = useLibraryStore((state) => state.artists);
  const tracks = useLibraryStore((state) => state.tracks);
  const tracksById = useLibraryStore((state) => state.tracksById);
  const featuredTrack = tracks[0];
  const playTrack = usePlayerStore((state) => state.playTrack);
  const favorites = useUserStore((state) => state.favorites);

  const latestFavorites = useMemo(() => {
    return favorites
      .slice(-4)
      .reverse()
      .map((trackId) => tracksById[trackId])
      .filter((track) => track !== undefined);
  }, [favorites, tracksById]);

  const trendingTracks = useMemo(() => tracks.slice(0, 5), [tracks]);

  return (
    <div className="page page--home">
      <section className="home-hero">
        <div className="home-hero__content">
          <p className="home-hero__eyebrow">Bibliothèque musicale francophone</p>
          <h1>Le player de tes VtuberFR & VSinger préférés</h1>
          <p className="home-hero__description">
            Découvre, classe et écoute la scène musicale virtuelle francophone. Tout le
            catalogue est stocké en local pour une expérience fluide et prête à devenir PWA.
          </p>
          {featuredTrack && (
            <div className="home-hero__cta">
              <button className="home-hero__cta_1 primary"
                type="button"
                onClick={() =>
                  playTrack(
                    featuredTrack.id,
                    tracks.map((track) => track.id),
                  )
                }
              >
                🎲 Écoute aléatoire
              </button>
              <button className="home-hero__cta_1 secondary"
                type="button"
                onClick={() =>
                  {
                    window.open('https://www.patreon.com/c/TakuDev', '_blank', 'noopener,noreferrer')
                  }
                }
              >
                Supporte le projet
              </button>
              <Link to="/search">Explorer la bibliothèque →</Link>
            </div>
          )}
        </div>
      </section>

      <section className="home-section">
        <div className="home-section__header">
          <h2>Trendy</h2>
          <Link to="/search">Tout afficher</Link>
        </div>
        <TrackList tracks={trendingTracks} showArtist />
      </section>

      <section className="home-section">
        <div className="home-section__header">
          <h2>Artistes à (re)découvrir</h2>
        </div>
        <div className="home-grid">
          {artists.map((artist) => (
            <ArtistCard key={artist.id} artist={artist} />
          ))}
        </div>
      </section>

      {latestFavorites.length > 0 && (
        <section className="home-section">
          <div className="home-section__header">
            <h2>Derniers favoris</h2>
            <Link to="/playlist/favorites">Voir la playlist</Link>
          </div>
          <TrackList tracks={latestFavorites} showArtist compact />
        </section>
      )}
    </div>
  );
}
