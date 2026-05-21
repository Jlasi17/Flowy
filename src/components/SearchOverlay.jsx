import { useState, useEffect, useRef, useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { groupsData } from "../data/musicRegistry";
import { AudioContext } from "../AudioPlayerProvider";
import { getArtistProfileImage } from "../utils/singerColors";
import "./SearchOverlay.css";

// Build a flat searchable database for all groups
const buildSearchIndex = () => {
  const songs = [];
  const albums = [];
  const artists = new Map();

  Object.entries(groupsData).forEach(([groupId, g]) => {
    // Group albums
    const flatGroupAlbums = (g.albums || []).flatMap(block =>
      (block.albums || []).map(a => ({ ...a, year: block.year, member: g.title, groupId }))
    );

    flatGroupAlbums.forEach(album => {
      albums.push({ ...album, isSolo: false });
      const albumSongs = (g.songs || {})[album.id] || [];
      albumSongs.forEach((song, idx) => {
        songs.push({
          name: song.name,
          file: song.file,
          albumId: album.id,
          albumTitle: album.title,
          albumCover: album.cover,
          albumColor: album.color,
          artist: g.title,
          groupId,
          isSolo: false,
          index: idx
        });
      });
    });

    // Solo albums (if any)
    const soloAlbumsData = (g.soloAlbums || []);
    soloAlbumsData.forEach(memberBlock => {
      const member = memberBlock.member;
      if (!artists.has(member)) {
        artists.set(member, {
          name: member,
          groupId,
          albumCount: 0,
          covers: [],
          profileImage: getArtistProfileImage(member)
        });
      }
      memberBlock.albums.forEach(album => {
        albums.push({ ...album, member, isSolo: true, groupId });
        const art = artists.get(member);
        art.albumCount++;
        if (art.covers.length < 3) art.covers.push(album.cover);

        const albumSongs = (g.soloSongs || {})[album.id] || [];
        albumSongs.forEach((song, idx) => {
          songs.push({
            name: song.name,
            file: song.file,
            albumId: album.id,
            albumTitle: album.title,
            albumCover: album.cover,
            albumColor: album.color,
            artist: member,
            groupId,
            isSolo: true,
            index: idx
          });
        });
      });
    });

    // Add Group itself as an artist
    artists.set(g.title, {
      name: g.title,
      groupId,
      albumCount: flatGroupAlbums.length,
      covers: flatGroupAlbums.slice(0, 3).map(a => a.cover),
      profileImage: getArtistProfileImage(g.title) || g.heroImg
    });
  });

  return { songs, albums, artists: Array.from(artists.values()) };
};

export default function SearchOverlay({ isOpen, onClose }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const [artistTransition, setArtistTransition] = useState(null); // { name, cover, albumCount }

  const {
    setSongs,
    setAlbumData,
    setCurrentIndex,
    setIsPlaying,
    addToQueue,
  } = useContext(AudioContext);

  const navigateToArtist = (artist) => {
    const groupId = artist.groupId || "bts";
    const group = groupsData[groupId];
    const soloists = group.soloists || [];
    
    if (artist.name === group.title) {
      sessionStorage.setItem(`${groupId}DashboardTab`, "group");
      sessionStorage.setItem(`${groupId}DashboardActiveIndex`, "0");
    } else {
      const idx = soloists.indexOf(artist.name);
      sessionStorage.setItem(`${groupId}DashboardTab`, "solos");
      sessionStorage.setItem(`${groupId}DashboardSoloIdx`, String(idx >= 0 ? idx : 0));
      sessionStorage.setItem(`${groupId}DashboardActiveIndex`, "0");
    }
    // Show transition overlay
    setArtistTransition({
      name: artist.name,
      cover: artist.profileImage || artist.covers[0],
      albumCount: artist.albumCount
    });
    // Navigate after animation plays
    setTimeout(() => {
      onClose();
      navigate(`/dashboard/${groupId}`);
      setTimeout(() => setArtistTransition(null), 100);
    }, 900);
  };

  const index = useMemo(() => buildSearchIndex(), []);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const normalizedQuery = query.toLowerCase().trim();

  const results = useMemo(() => {
    if (!normalizedQuery) return { songs: [], albums: [], artists: [] };

    const matchedSongs = index.songs
      .filter(s => s.name.toLowerCase().includes(normalizedQuery))
      .slice(0, 8);

    const matchedAlbums = index.albums
      .filter(a => a.title.toLowerCase().includes(normalizedQuery))
      .slice(0, 6);

    const matchedArtists = index.artists
      .filter(a => a.name.toLowerCase().includes(normalizedQuery))
      .slice(0, 4);

    return { songs: matchedSongs, albums: matchedAlbums, artists: matchedArtists };
  }, [normalizedQuery, index]);

  const totalResults = results.songs.length + results.albums.length + results.artists.length;

  const playSong = (song) => {
    const groupId = song.groupId || "bts";
    const group = groupsData[groupId];
    const basePath = song.isSolo ? group.soloBasePath : group.basePath;

    const allSongs = song.isSolo
      ? (group.soloSongs[song.albumId] || [])
      : (group.songs[song.albumId] || []);

    const groupAlbums = (group.albums || []).flatMap(y => y.albums);
    const soloAlbums = (group.soloAlbums || []).flatMap(m => m.albums);
    const album = groupAlbums.find(a => a.id === song.albumId) || soloAlbums.find(a => a.id === song.albumId);

    const mappedSongs = allSongs.map(s => ({
      name: s.name,
      filePath: song.isSolo ? `${basePath}${s.file}` : `${basePath}${song.albumId}/${s.file}`,
      cover: album.cover,
      member: song.artist,
      albumTitle: album.title,
      color: album.color
    }));

    setSongs(mappedSongs);
    setAlbumData({ ...album, member: song.artist });
    setCurrentIndex(song.index);
    setIsPlaying(true);
    onClose();
  };

  const openAlbum = (album) => {
    onClose();
    navigate(`/album/${album.id}`);
  };

  if (!isOpen) return null;

  return (
    <div className={`search-overlay ${isOpen ? 'open' : ''}`}>
      <div className="search-overlay-backdrop" onClick={onClose} />
      <div className="search-panel">
        <div className="search-header">
          <div className="search-input-wrapper">
            <svg className="search-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input
              ref={inputRef}
              type="text"
              className="search-input"
              placeholder="Search songs, albums, artists..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoComplete="off"
              spellCheck="false"
            />
            {query && (
              <button className="search-clear" onClick={() => { setQuery(""); inputRef.current?.focus(); }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              </button>
            )}
          </div>
          <button className="search-close-btn" onClick={onClose}>Cancel</button>
        </div>

        <div className="search-results">
          {normalizedQuery && totalResults === 0 && (
            <div className="search-empty">
              <span className="search-empty-icon">🔍</span>
              <p>No results for "<strong>{query}</strong>"</p>
              <span className="search-empty-hint">Try searching for a song, album, or artist name</span>
            </div>
          )}

          {!normalizedQuery && (
            <div className="search-empty">
              <span className="search-empty-icon">✨</span>
              <p>Search your music</p>
              <span className="search-empty-hint">Find songs by name, album, or artist</span>
              <span className="search-swipe-hint">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ marginRight: 5, opacity: 0.5 }}>
                  <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 5 5 12 12 19"/>
                </svg>
                Swipe a song left to add to queue
              </span>
            </div>
          )}

          {/* SONGS */}
          {results.songs.length > 0 && (
            <div className="search-section">
              <h3 className="search-section-title">Songs</h3>
              {results.songs.map((song, i) => (
                <button
                  key={`song-${i}`}
                  className="search-result-item"
                  onClick={() => playSong(song)}
                >
                  <img src={song.albumCover} alt="" className="search-result-thumb" />
                  <div className="search-result-info">
                    <span className="search-result-name">{highlightMatch(song.name, normalizedQuery)}</span>
                    <span className="search-result-meta">Song · {song.artist} · {song.albumTitle}</span>
                  </div>
                  <div className="search-song-actions">
                    <button
                      className="search-queue-btn"
                      title="Add to queue"
                      onClick={(e) => {
                        e.stopPropagation();
                        const group = groupsData[song.groupId];
                        const basePath = song.isSolo ? group.soloBasePath : group.basePath;
                        const folder = song.isSolo ? '' : `${song.albumId}/`;
                        
                        addToQueue({
                          name: song.name,
                          filePath: `${basePath}${folder}${song.file}`,
                          albumTitle: song.albumTitle,
                          cover: song.albumCover,
                          member: song.artist,
                          color: song.albumColor,
                        });
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                    </button>
                    <svg className="search-result-play" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* ALBUMS */}
          {results.albums.length > 0 && (
            <div className="search-section">
              <h3 className="search-section-title">Albums</h3>
              {results.albums.map((album, i) => (
                <button
                  key={`album-${i}`}
                  className="search-result-item"
                  onClick={() => openAlbum(album)}
                >
                  <img src={album.cover} alt="" className="search-result-thumb search-result-thumb--album" />
                  <div className="search-result-info">
                    <span className="search-result-name">{highlightMatch(album.title, normalizedQuery)}</span>
                    <span className="search-result-meta">Album · {album.member || "BTS"} · {album.release || album.year}</span>
                  </div>
                  <svg className="search-result-arrow" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
                </button>
              ))}
            </div>
          )}

          {/* ARTISTS */}
          {results.artists.length > 0 && (
            <div className="search-section">
              <h3 className="search-section-title">Artists</h3>
              {results.artists.map((artist, i) => (
                <button
                  key={`artist-${i}`}
                  className="search-result-item search-result-item--artist"
                  onClick={() => navigateToArtist(artist)}
                >
                  <div className="search-artist-avatar">
                    <img src={artist.profileImage || artist.covers[0]} alt="" />
                  </div>
                  <div className="search-result-info">
                    <span className="search-result-name">{highlightMatch(artist.name, normalizedQuery)}</span>
                    <span className="search-result-meta">Artist · {artist.albumCount} album{artist.albumCount > 1 ? 's' : ''}</span>
                  </div>
                  <svg className="search-result-arrow" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Artist Transition Overlay */}
      {artistTransition && (
        <div className="artist-transition-overlay">
          <div className="artist-transition-bg" style={{ backgroundImage: `url(${artistTransition.cover})` }} />
          <div className="artist-transition-content">
            <div className="artist-transition-avatar">
              {artistTransition.cover && <img src={artistTransition.cover} alt="" />}
            </div>
            <h2 className="artist-transition-name">{artistTransition.name}</h2>
            <p className="artist-transition-meta">{artistTransition.albumCount} album{artistTransition.albumCount > 1 ? 's' : ''}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function highlightMatch(text, query) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="search-highlight">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}
