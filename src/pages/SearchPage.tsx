import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import { ArtistCard } from '../components/Library/ArtistCard';
import { TrackList } from '../components/Library/TrackList';
import { useLibraryStore } from '../stores/libraryStore';

import './SearchPage.scss';

export function SearchPage() {
  const location = useLocation();
  const searchLibrary = useLibraryStore((state) => state.search);
  const query = useMemo(
    () => new URLSearchParams(location.search).get('q') ?? '',
    [location.search],
  );

  const results = useMemo(() => searchLibrary(query), [query, searchLibrary]);
  const showEmpty =
    query.trim().length > 0 &&
    results.artists.length === 0 &&
    results.tracks.length === 0;

  return (
    <div className="page search-page">
      <header className="search-header">
        <h1>Recherche</h1>
        <p>
          {query
            ? `Résultats pour « ${query} »`
            : "Tape un nom d'artiste, de chanson ou un tag pour filtrer la bibliothèque."}
        </p>
      </header>

      {showEmpty ? (
        <div className="search-empty">
          <p>Aucun résultat pour cette recherche.</p>
          <p>Essaie avec un autre mot-clé ou explore la bibliothèque complète.</p>
        </div>
      ) : (
        <>
          <section className="search-section">
            <h2>Artistes</h2>
            {results.artists.length === 0 ? (
              <p className="search-muted">Aucun artiste ne correspond.</p>
            ) : (
              <div className="search-grid">
                {results.artists.map((artist) => (
                  <ArtistCard key={artist.id} artist={artist} />
                ))}
              </div>
            )}
          </section>

          <section className="search-section">
            <h2>Morceaux</h2>
            {results.tracks.length === 0 ? (
              <p className="search-muted">Aucun morceau ne correspond.</p>
            ) : (
              <TrackList tracks={results.tracks} showArtist />
            )}
          </section>
        </>
      )}
    </div>
  );
}
