import { useState, useEffect, useRef, useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { groupsData } from "../data/musicRegistry";
import { AudioContext } from "../AudioPlayerProvider";
import { useAdvancedSearch } from "../hooks/useAdvancedSearch";
import { recordPlayHistory } from "../utils/searchScoring";
import SwipeableTrack from "./SwipeableTrack";
import "./SearchOverlay.css";

export default function SearchOverlay({ isOpen, onClose }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const [artistTransition, setArtistTransition] = useState(null);
  const [addedQueueSongs, setAddedQueueSongs] = useState({});

  const {
    setSongs,
    setAlbumData,
    setCurrentIndex,
    setIsPlaying,
    addToQueue,
    activeSong,
    isPlaying
  } = useContext(AudioContext);

  const { results, isSearching, ghostText } = useAdvancedSearch(query);

  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const saved = localStorage.getItem('flowy_recent_searches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveToRecent = (item, type) => {
    try {
      const recentItem = {
        id: item.name || item.title,
        name: item.name || item.title,
        type: type,
        artist: item.artist || item.member || 'Artist',
        cover: item.albumCover || item.cover || item.profileImage || item.covers?.[0],
        groupId: item.groupId,
        albumId: item.albumId,
        isSolo: item.isSolo,
        file: item.file,
        index: item.index
      };

      setRecentSearches(prev => {
        const filtered = prev.filter(r => r.id !== recentItem.id);
        const updated = [recentItem, ...filtered].slice(0, 8);
        localStorage.setItem('flowy_recent_searches', JSON.stringify(updated));
        return updated;
      });
    } catch (e) {
      console.error("Failed to save recent search", e);
    }
  };

  const removeRecent = (e, id) => {
    e.stopPropagation();
    setRecentSearches(prev => {
      const updated = prev.filter(r => r.id !== id);
      localStorage.setItem('flowy_recent_searches', JSON.stringify(updated));
      return updated;
    });
  };

  const navigateToArtist = (artist) => {
    recordPlayHistory(artist);
    saveToRecent(artist, 'artist');
    const groupId = artist.groupId || "bts";
    const group = groupsData[groupId];
    const soloists = group.soloists || [];
    
    if (artist.name === group.title) {
      sessionStorage.setItem(`${groupId}DashboardTab`, "group");
      sessionStorage.setItem(`${groupId}DashboardActiveIndex`, "0");
    } else {
      const idx = soloists.findIndex(s => s.name === artist.name);
      sessionStorage.setItem(`${groupId}DashboardTab`, "solos");
      sessionStorage.setItem(`${groupId}DashboardSoloIdx`, String(idx >= 0 ? idx : 0));
      sessionStorage.setItem(`${groupId}DashboardActiveIndex`, "0");
    }
    setArtistTransition({
      name: artist.name,
      cover: artist.profileImage || artist.covers?.[0] || artist.albumCover,
      albumCount: artist.albumCount || 0
    });
    setTimeout(() => {
      onClose();
      navigate(`/dashboard/${groupId}`);
      setTimeout(() => setArtistTransition(null), 100);
    }, 900);
  };



  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" && isOpen) onClose();
      // Handle tab for autocomplete
      if (e.key === "Tab" && isOpen && ghostText) {
        e.preventDefault();
        setQuery(query + ghostText);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose, ghostText, query]);

  const handleAddToQueue = (song, e) => {
    if (e) e.stopPropagation();
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

    if (navigator.vibrate) navigator.vibrate(8);

    setAddedQueueSongs(prev => ({ ...prev, [song.name]: true }));
    setTimeout(() => {
      setAddedQueueSongs(prev => ({ ...prev, [song.name]: false }));
    }, 2000);
  };

  const handleItemClick = (item) => {
    if (item.type === 'album') {
      openAlbum(item);
      return;
    }
    if (item.type === 'artist') {
      navigateToArtist(item);
      return;
    }
    
    // For songs and lyrics
    const isThisSong = activeSong && activeSong.name === (item.name || item.title);
    if (isThisSong) {
      setIsPlaying(!isPlaying);
    } else {
      playSong(item);
    }
  };

  const renderPlayPauseIcon = (item) => {
    const isThisSong = isPlaying && activeSong && activeSong.name === (item.name || item.title);
    return isThisSong ? (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
    ) : (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
    );
  };

  const playSong = (song) => {
    recordPlayHistory(song);
    saveToRecent(song, song.lyricMatch ? 'lyrics' : 'song');
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
  };

  const openAlbum = (album) => {
    recordPlayHistory(album);
    saveToRecent(album, 'album');
    onClose();
    navigate(`/album/${album.id}`);
  };

  if (!isOpen) return null;

  const totalResults = results.songs.length + results.albums.length + results.artists.length + results.lyrics.length;

  return (
    <div className={`search-overlay ${isOpen ? 'open' : ''}`}>
      <div className="search-overlay-backdrop" onClick={onClose} />
      <div className="search-panel">
        <div className="search-header">
          <div className="search-input-wrapper">
            <svg className="search-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <div className="search-input-container">
              {ghostText && query && (
                <div className="search-ghost">
                  <span style={{ visibility: 'hidden' }}>{query}</span>
                  <span className="ghost-text">{ghostText}</span>
                </div>
              )}
              <input
                ref={inputRef}
                type="text"
                className="search-input"
                placeholder="What do you want to listen to?"
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoComplete="off"
                spellCheck="false"
              />
            </div>
            {query && (
              <button className="search-clear" onClick={() => { setQuery(""); inputRef.current?.focus(); }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
              </button>
            )}
          </div>
          <button className="search-close-btn" onClick={onClose}>Cancel</button>
        </div>

        <div className="search-results">
          {query && totalResults === 0 && !isSearching && (
            <div className="search-empty">
              <span className="search-empty-icon">🔍</span>
              <p>No results for "<strong>{query}</strong>"</p>
              <span className="search-empty-hint">Try searching for a song, album, artist or lyrics</span>
            </div>
          )}

          {!query && (
            <div className="search-empty-state">
              {recentSearches.length > 0 ? (
                <>
                  <div className="recent-searches-header">
                    <h3 className="search-section-title">Recent searches</h3>
                    <button className="clear-recent-btn" onClick={() => { setRecentSearches([]); localStorage.removeItem('flowy_recent_searches'); }}>Clear</button>
                  </div>
                  <div className="search-lists">
                    {recentSearches.map((item, i) => {
                      const isAdded = !!addedQueueSongs[item.name];
                      const isSong = item.type === 'song' || item.type === 'lyrics';
                      
                      const content = (
                        <div 
                          className={`search-result-item ${item.type === 'artist' ? 'search-result-item--artist' : ''}`}
                          onClick={() => handleItemClick(item)}
                        >
                          <div className={item.type === 'artist' ? 'search-artist-avatar' : 'search-result-thumb-wrapper'}>
                            <img 
                              src={item.cover} 
                              alt="" 
                              className={item.type === 'artist' ? '' : 'search-result-thumb' + (item.type === 'album' ? ' search-result-thumb--album' : '')} 
                            />
                            {item.type !== 'artist' && (
                              <div className="search-result-play-overlay">
                                {renderPlayPauseIcon(item)}
                              </div>
                            )}
                          </div>
                          <div className="search-result-info">
                            <span className="search-result-name">{item.name}</span>
                            <span className="search-result-meta">{item.type.charAt(0).toUpperCase() + item.type.slice(1)} {item.artist ? `• ${item.artist}` : ''}</span>
                          </div>
                          
                          {isSong && (
                            <div className="search-song-actions">
                              <button
                                className={`search-queue-btn${isAdded ? ' search-queue-btn--added' : ''}`}
                                onClick={(e) => !isAdded && handleAddToQueue(item, e)}
                              >
                                <span className="search-queue-btn-inner">
                                  <svg className="search-queue-icon search-queue-icon--plus" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                  <svg className="search-queue-icon search-queue-icon--check" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                  <span className="search-queue-label">{isAdded ? "Added" : "Queue"}</span>
                                </span>
                              </button>
                            </div>
                          )}
                          <button className="recent-search-remove" onClick={(e) => removeRecent(e, item.id)}>
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
                          </button>
                        </div>
                      );

                      return isSong ? (
                        <SwipeableTrack
                          key={`recent-${i}`}
                          onSwipeAction={() => handleAddToQueue(item)}
                          actionText={isAdded ? "✓ Added" : "＋ Queue"}
                          actionColor={isAdded ? "#1db954" : "#1db954"}
                        >
                          {content}
                        </SwipeableTrack>
                      ) : <div key={`recent-${i}`}>{content}</div>;
                    })}
                  </div>
                </>
              ) : (
                <div className="search-empty">
                  <span className="search-empty-icon">✨</span>
                  <p>Search your music</p>
                  <span className="search-empty-hint">Find songs by name, album, or artist</span>
                  <span className="search-swipe-hint">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ marginRight: 5, opacity: 0.5 }}>
                      <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 5 5 12 12 19" />
                    </svg>
                    Swipe a song left to add to queue
                  </span>
                </div>
              )}
            </div>
          )}

          {query && isSearching && (
            <div className="search-loading">
               <div className="skeleton-card" />
               <div className="skeleton-line" />
               <div className="skeleton-line" />
               <div className="skeleton-line" />
            </div>
          )}

          {!isSearching && query && totalResults > 0 && (
            <div className="search-content">
              {/* Top Result Section */}
              {results.topResult && (
                <div className="search-top-result-container">
                  <h3 className="search-section-title">Top Result</h3>
                  <div 
                    className="top-result-card" 
                    onClick={() => handleItemClick(results.topResult)}
                  >
                    <img 
                      src={results.topResult.albumCover || results.topResult.cover || results.topResult.profileImage || results.topResult.covers?.[0]} 
                      alt="" 
                      className={`top-result-img ${results.topResult.type === 'artist' ? 'is-artist' : ''}`}
                    />
                    <div className="top-result-info">
                      <h2 className="top-result-title">{results.topResult.name || results.topResult.title}</h2>
                      <div className="top-result-meta">
                        <span className="top-result-badge">{results.topResult.type.toUpperCase()}</span>
                        {results.topResult.type !== 'artist' && (
                          <span className="top-result-artist">• {results.topResult.artist || results.topResult.member}</span>
                        )}
                      </div>
                    </div>
                    {(results.topResult.type === 'song' || results.topResult.type === 'lyrics') && (
                      <div className="top-result-play-btn">
                        {renderPlayPauseIcon(results.topResult)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="search-lists">
                {/* SONGS */}
                {results.songs.length > 0 && (
                  <div className="search-section">
                    <h3 className="search-section-title">Songs</h3>
                    {results.songs.map((song, i) => {
                      const isAdded = !!addedQueueSongs[song.name];
                      return (
                        <SwipeableTrack
                          key={`song-${i}`}
                          onSwipeAction={() => handleAddToQueue(song)}
                          actionText={isAdded ? "✓ Added" : "＋ Queue"}
                          actionColor={isAdded ? "#1db954" : (song.albumColor || "rgba(29, 185, 84, 0.4)")}
                          onClick={() => handleItemClick(song)}
                        >
                          <div className="search-result-item">
                            <div className="search-result-thumb-wrapper">
                              <img src={song.albumCover} alt="" className="search-result-thumb" />
                              <div className="search-result-play-overlay">
                                {renderPlayPauseIcon(song)}
                              </div>
                            </div>
                            <div className="search-result-info">
                              <span className="search-result-name">{highlightMatch(song.name, query)}</span>
                              <span className="search-result-meta">{song.artist}</span>
                            </div>
                            <div className="search-song-actions">
                              <button
                                className={`search-queue-btn${isAdded ? ' search-queue-btn--added' : ''}`}
                                onClick={(e) => !isAdded && handleAddToQueue(song, e)}
                              >
                                <span className="search-queue-btn-inner">
                                  <svg className="search-queue-icon search-queue-icon--plus" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                  <svg className="search-queue-icon search-queue-icon--check" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                  <span className="search-queue-label">{isAdded ? "Added" : "Queue"}</span>
                                </span>
                              </button>
                            </div>
                          </div>
                        </SwipeableTrack>
                      );
                    })}
                  </div>
                )}

                {/* LYRICS */}
                {results.lyrics.length > 0 && (
                  <div className="search-section">
                    <h3 className="search-section-title">Lyrics Matches</h3>
                    {results.lyrics.map((song, i) => {
                      const isAdded = !!addedQueueSongs[song.name];
                      return (
                        <SwipeableTrack
                          key={`lyric-${i}`}
                          onSwipeAction={() => handleAddToQueue(song)}
                          actionText={isAdded ? "✓ Added" : "＋ Queue"}
                          actionColor={isAdded ? "#1db954" : (song.albumColor || "rgba(29, 185, 84, 0.4)")}
                          onClick={() => handleItemClick(song)}
                        >
                          <div className="search-result-item">
                            <div className="search-result-thumb-wrapper">
                              <img src={song.albumCover} alt="" className="search-result-thumb" />
                              <div className="search-result-play-overlay">
                                {renderPlayPauseIcon(song)}
                              </div>
                            </div>
                            <div className="search-result-info">
                              <span className="search-result-name">{song.name}</span>
                              <span className="search-result-meta">Found in lyrics • {song.artist}</span>
                            </div>
                            <div className="search-song-actions">
                              <button
                                className={`search-queue-btn${isAdded ? ' search-queue-btn--added' : ''}`}
                                onClick={(e) => !isAdded && handleAddToQueue(song, e)}
                              >
                                <span className="search-queue-btn-inner">
                                  <svg className="search-queue-icon search-queue-icon--plus" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                  <svg className="search-queue-icon search-queue-icon--check" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                  <span className="search-queue-label">{isAdded ? "Added" : "Queue"}</span>
                                </span>
                              </button>
                            </div>
                          </div>
                        </SwipeableTrack>
                      );
                    })}
                  </div>
                )}

                {/* ARTISTS */}
                {results.artists.length > 0 && (
                  <div className="search-section">
                    <h3 className="search-section-title">Artists</h3>
                    {results.artists.map((artist, i) => (
                      <button key={`artist-${i}`} className="search-result-item search-result-item--artist" onClick={() => navigateToArtist(artist)}>
                        <div className="search-artist-avatar">
                          <img src={artist.profileImage || artist.covers[0]} alt="" />
                        </div>
                        <div className="search-result-info">
                          <span className="search-result-name">{highlightMatch(artist.name, query)}</span>
                          <span className="search-result-meta">Artist</span>
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
                      <button key={`album-${i}`} className="search-result-item" onClick={() => openAlbum(album)}>
                        <div className="search-result-thumb-wrapper">
                          <img src={album.cover} alt="" className="search-result-thumb search-result-thumb--album" />
                          <div className="search-result-play-overlay">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                          </div>
                        </div>
                        <div className="search-result-info">
                          <span className="search-result-name">{highlightMatch(album.title, query)}</span>
                          <span className="search-result-meta">Album • {album.member || "BTS"}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
  const normalizedQuery = query.toLowerCase().trim();
  const lowerText = text.toLowerCase();
  const idx = lowerText.indexOf(normalizedQuery);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="search-highlight">{text.slice(idx, idx + normalizedQuery.length)}</mark>
      {text.slice(idx + normalizedQuery.length)}
    </>
  );
}