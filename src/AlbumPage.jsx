import { useParams, useNavigate } from 'react-router-dom';
import { useContext, useEffect, useState, useRef, useMemo } from 'react';
import { AudioContext } from './AudioPlayerProvider';
import { groupsData } from './data/musicRegistry';
import SwipeableTrack from './components/SwipeableTrack';
import AddToPlaylistPopup from './components/AddToPlaylistPopup';
import CreatePlaylistModal from './CreatePlaylistModal';
import { getHeartColor } from './utils/singerColors';
import './AlbumPage.css';

export default function AlbumPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [songDurations, setSongDurations] = useState({});
  const [addedToast, setAddedToast] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isHeaderStuck, setIsHeaderStuck] = useState(false);
  const coverRef = useRef(null);
  const scrollRef = useRef(null);
  const sentinelRef = useRef(null);

  const {
    setSongs,
    setCurrentIndex,
    setAlbumData,
    setAlbumId,
    isPlaying,
    setIsPlaying,
    activeSong,
    addToQueue,
    triggerFlyAnimation,
    likedSongs,
    toggleLike,
    requireAuth,
    createPlaylist,
    addSongToPlaylist,
    setAddToPlaylistSong
  } = useContext(AudioContext);

  // Resize listener
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Scroll listener — detects when sentinel passes top of viewport
  useEffect(() => {
    if (!isMobile) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsHeaderStuck(!entry.isIntersecting),
      { threshold: 0 }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [isMobile]);

  const handleContextMenu = (song, e, index) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = { x: e.clientX, y: e.clientY };
    const songObj = {
      name: song.name,
      filePath: isSolo ? `${basePath}${song.file}` : `${basePath}${id}/${song.file}`,
      cover: album?.cover,
      member: album?.member || groupTitle,
      albumTitle: album?.title,
      color: album?.color,
      duration: song.duration || songDurations[song.name] || "—",
    };
    setAddToPlaylistSong(songObj);
  };

  let foundGroup = null;
  let foundAlbum = null;
  let tracks = [];
  let soloStatus = false;

  Object.entries(groupsData).forEach(([groupId, g]) => {
    const groupAlbums = (g.albums || []).flatMap(y => y.albums);
    const soloAlbums = (g.soloAlbums || []).flatMap(m => m.albums);

    const a = groupAlbums.find(a => a.id === id);
    if (a) {
      foundGroup = g;
      foundAlbum = a;
      tracks = (g.songs || {})[id] || [];
      soloStatus = false;
    }

    const s = soloAlbums.find(a => a.id === id);
    if (s && !foundAlbum) {
      foundGroup = g;
      foundAlbum = s;
      tracks = (g.soloSongs || {})[id] || [];
      soloStatus = true;
    }
  });

  const album = foundAlbum;
  const albumSongs = tracks;
  const isSolo = soloStatus;
  const basePath = isSolo ? foundGroup?.soloBasePath : foundGroup?.basePath;
  const groupTitle = foundGroup?.title || "Artist";

  useEffect(() => {
    const loadDurations = async () => {
      const durations = {};
      for (let song of albumSongs) {
        if (song.duration) {
          durations[song.name] = song.duration;
          continue;
        }
        
        const path = isSolo ? `${basePath}${song.file}` : `${basePath}${id}/${song.file}`;
        const audio = new Audio(path);
        await new Promise((resolve) => {
          audio.addEventListener("loadedmetadata", () => {
            const mins = Math.floor(audio.duration / 60);
            const secs = Math.floor(audio.duration % 60).toString().padStart(2, "0");
            durations[song.name] = `${mins}:${secs}`;
            resolve();
          });
          audio.addEventListener("error", resolve);
        });
      }
      setSongDurations(durations);
    };

    if (albumSongs.length) loadDurations();
  }, [id]);

  const playSongAt = (index) => {
    if (!album) return;
    const mappedSongs = albumSongs.map((song) => ({
      name: song.name,
      filePath: isSolo ? `${basePath}${song.file}` : `${basePath}${id}/${song.file}`,
      cover: album.cover,
      member: album.member || groupTitle,
      albumTitle: album.title,
      color: album.color
    }));
    setSongs(mappedSongs);
    setAlbumData({ ...album, member: album.member || groupTitle });
    setAlbumId(id);
    setCurrentIndex(index);
  };



  // ── MOBILE LAYOUT ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        <div
          className="album-page album-page--mobile"
          style={{ backgroundImage: `url(${album?.cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          <div className="album-overlay" />

          {/* ── Sticky header bar ─ pins once sentinel scrolls off ── */}
          <div className={`mob-album-header ${isHeaderStuck ? 'mob-album-header--stuck' : ''}`}>
            <button
              className="mob-back-btn"
              onClick={() => {
                if (!document.startViewTransition) { navigate(-1); return; }
                document.startViewTransition(() => navigate(-1));
              }}
            >
              <svg fill="currentColor" width="24" height="24" viewBox="0 0 24 24">
                <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z" />
              </svg>
            </button>

            <div className={`mob-header-cover ${isHeaderStuck ? 'mob-header-cover--visible' : ''}`}>
              <img src={album?.cover} alt={album?.title} />
            </div>

            <div className={`mob-header-info ${isHeaderStuck ? 'mob-header-info--visible' : ''}`}>
              <span className="mob-header-title">{album?.title}</span>
              <span className="mob-header-sub">{album?.member || groupTitle} · {album?.release?.split(' ').pop()}</span>
            </div>

            <button
              className={`mob-header-play ${isHeaderStuck ? 'mob-header-play--visible' : ''}`}
              onClick={() => playSongAt(0)}
              aria-label="Play album"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            </button>
          </div>

          {/* ── Scrollable content area ── */}
          <div className="mob-scroll-content">
            {/* Sentinel: when this exits viewport the header sticks */}
            <div ref={sentinelRef} className="mob-sentinel" />

            {/* Hero: large cover + album info (scrolls away) */}
            <div className="mob-hero">
              <div className="mob-hero-cover">
                <img ref={coverRef} src={album?.cover} alt={album?.title} />
              </div>
              <div className="mob-hero-info">
                <h1 className="mob-hero-title">{album?.title}</h1>
                <p className="mob-hero-sub">{album?.member || groupTitle}</p>
                <p className="mob-hero-meta">K-Pop · {album?.release?.split(' ').pop()}</p>
                {/* Play button lives here before scroll */}
                <button
                  className={`mob-hero-play-btn ${isHeaderStuck ? 'mob-hero-play-btn--hidden' : ''}`}
                  onClick={() => playSongAt(0)}
                  aria-label="Play album"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                  <span>Play</span>
                </button>
              </div>
            </div>

            {/* Tracklist */}
            <div className="mob-tracklist">
              {albumSongs.map((song, index) => {
                const isHidden = song.isHidden;
                const encodedFile = song.file.split('/').map(encodeURIComponent).join('/');
                const folderPrefix = isSolo ? "" : `${id}/`;
                const computedPath = `${basePath}${folderPrefix}${encodedFile}`;
                const rawPath = `${basePath}${folderPrefix}${song.file}`;
                const isRow = activeSong?.filePath === computedPath || activeSong?.filePath === rawPath;

                return (
                  <SwipeableTrack
                    key={index}
                    onSwipeRight={() => {
                      setAddToPlaylistSong({
                        name: song.name, filePath: computedPath,
                        cover: album?.cover, member: album?.member || groupTitle,
                        albumTitle: album?.title, color: album?.color,
                        duration: song.duration || songDurations[song.name] || "—",
                      });
                    }}
                    onSwipeLeft={(e) => {
                      const wrapper = e?.target?.closest?.('.swipeable-track-wrapper');
                      const sourceRect = wrapper?.getBoundingClientRect() || null;
                      requireAuth(() => {
                        addToQueue({
                          name: song.name, filePath: computedPath,
                          albumTitle: album?.title || "Album", cover: album?.cover,
                          member: album?.member || groupTitle,
                          duration: song.duration || songDurations[song.name] || "—",
                          color: album?.color
                        });
                        if (sourceRect) triggerFlyAnimation(sourceRect, song.name, album?.cover);
                      });
                    }}
                    rightActionText="＋ Playlist" rightActionColor="#C084FC"
                    leftActionText="＋ Queue" leftActionColor={album?.color || "rgba(29,185,84,0.4)"}
                    onClick={() => { if (isRow) setIsPlaying(!isPlaying); else playSongAt(index); }}
                  >
                    <div
                      className={`song-row-minimal ${isRow ? "playing" : ""} ${isHidden ? "hidden-row" : ""}`}
                      style={{ animationDelay: `${index * 35}ms` }}
                      onContextMenu={(e) => handleContextMenu(song, e, index)}
                    >
                      {isHidden && <div className="hidden-slot-glow" />}
                      <span className="song-index-minimal">
                        <span className="song-idx-number">{isRow && isPlaying ? "" : String(index + 1).padStart(2, '0')}</span>
                        <svg className="track-hover-icon" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                          {isRow && isPlaying ? <><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></> : <path d="M8 5v14l11-7z" />}
                        </svg>
                        {isRow && isPlaying && (
                          <div className="track-playing-bars">
                            <div className="track-bar" /><div className="track-bar" />
                            <div className="track-bar" /><div className="track-bar" />
                          </div>
                        )}
                      </span>
                      <span className="song-title-minimal">
                        {song.name}
                        {isHidden && <span className="hidden-track-badge">Hidden Track</span>}
                      </span>
                      <div className="song-actions-minimal">
                        <button
                          className={`album-like-btn ${likedSongs[song.name] ? 'heart-anim-active' : ''}`}
                          onClick={(e) => { e.stopPropagation(); requireAuth(() => toggleLike(song.name, e)); }}
                          aria-label="Like"
                          style={{
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            color: likedSongs[song.name] ? getHeartColor(album?.color) : 'rgba(255,255,255,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, transition: 'color 0.2s'
                          }}
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16"
                            fill={likedSongs[song.name] ? 'currentColor' : 'none'}
                            stroke="currentColor" strokeWidth={likedSongs[song.name] ? 0 : 2}
                            strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                          </svg>
                        </button>
                        <span className="song-duration-minimal">{song.duration || songDurations[song.name] || "—"}</span>
                      </div>
                    </div>
                  </SwipeableTrack>
                );
              })}
              <div className="album-footer-stats">{albumSongs.length} tracks · {album?.release?.split(' ').pop()}</div>
              <div style={{ paddingBottom: '140px' }} />
            </div>
          </div>
        </div>

        <CreatePlaylistModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onConfirm={(title, coverData, color) => { createPlaylist({ title, cover: coverData, color }); setIsCreateModalOpen(false); }}
        />
        {addedToast && (
          <div style={{
            position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(14,14,20,0.95)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff', padding: '10px 20px', borderRadius: '100px',
            fontSize: '13px', fontWeight: 500, zIndex: 3000,
            backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            letterSpacing: '0.3px', whiteSpace: 'nowrap'
          }}>
            ✓ Added to <strong>{addedToast.title || addedToast}</strong>
          </div>
        )}
      </>
    );
  }

  // ── DESKTOP LAYOUT ──────────────────────────────────────────────────────────
  return (
    <>
      <div className="album-page" style={{
        backgroundImage: `url(${album?.cover})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}>
        <div className="album-overlay" />

        <div className="album-content-two-col">
          <div className="album-left-col">
            <button className="back-btn-minimal" onClick={() => {
              if (coverRef.current) {
                coverRef.current.style.viewTransitionName = 'album-hero';
              }
              if (!document.startViewTransition) { navigate(-1); return; }
              document.startViewTransition(() => navigate(-1));
            }}>
              <svg fill="currentColor" width="28" height="28" viewBox="0 0 24 24">
                <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z" />
              </svg>
            </button>
            <div className="album-3d-showcase">
              <div className="album-3d-object">
                <img
                  ref={coverRef}
                  src={album?.cover}
                  alt={album?.title}
                  className="album-face album-front"
                />
                <img src={album?.cover} className="album-face album-back" alt={album?.title} draggable={false} />
                <div className="album-face album-spine-left" style={{ background: album?.color || '#2a2a2a' }} />
                <div className="album-face album-spine-right" style={{ background: album?.color || '#2a2a2a' }} />
                <div className="album-face album-spine-top" />
                <div className="album-face album-spine-bottom" />
              </div>
            </div>

            <div className="album-info-centered">
              <h1 className="album-title-minimal">{album?.title}</h1>
              <p className="album-sub-minimal">{album?.member || groupTitle}</p>
              <p className="album-meta-minimal">K-Pop · {album?.release?.split(' ').pop()}</p>
            </div>

            <div className="album-actions">
              <button className="action-btn action-btn--play" onClick={() => playSongAt(0)}>
                <svg className="action-btn-icon" viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><polygon points="5,3 19,12 5,21" /></svg>
                <span className="action-btn-label">Play</span>
              </button>
              <button className="action-btn action-btn--shuffle" onClick={() => playSongAt(Math.floor(Math.random() * albumSongs.length))}>Shuffle</button>
            </div>
          </div>

          <div className="album-right-col">
            <div className="song-list-minimal">
              {albumSongs.map((song, index) => {
                const isHidden = song.isHidden;
                const encodedFile = song.file.split('/').map(encodeURIComponent).join('/');
                const folderPrefix = isSolo ? "" : `${id}/`;
                const computedPath = `${basePath}${folderPrefix}${encodedFile}`;
                const rawPath = `${basePath}${folderPrefix}${song.file}`;
                const isRow = activeSong?.filePath === computedPath || activeSong?.filePath === rawPath;

                return (
                  <SwipeableTrack
                    key={index}
                    onSwipeRight={(e) => {
                      const songObj = {
                        name: song.name,
                        filePath: computedPath,
                        cover: album?.cover,
                        member: album?.member || groupTitle,
                        albumTitle: album?.title,
                        color: album?.color,
                        duration: song.duration || songDurations[song.name] || "—",
                      };
                      setAddToPlaylistSong(songObj);
                    }}
                    onSwipeLeft={(e) => {
                      const wrapper = e?.target?.closest?.('.swipeable-track-wrapper');
                      const sourceRect = wrapper?.getBoundingClientRect() || null;
                      requireAuth(() => {
                        addToQueue({
                          name: song.name,
                          filePath: computedPath,
                          albumTitle: album?.title || "Album",
                          cover: album?.cover,
                          member: album?.member || groupTitle,
                          duration: song.duration || songDurations[song.name] || "—",
                          color: album?.color
                        });
                        if (sourceRect) triggerFlyAnimation(sourceRect, song.name, album?.cover);
                      });
                    }}
                    rightActionText="＋ Playlist"
                    rightActionColor="#C084FC"
                    leftActionText="＋ Queue"
                    leftActionColor={album?.color ? album.color : "rgba(29, 185, 84, 0.4)"}
                    onClick={() => {
                      if (isRow) {
                        setIsPlaying(!isPlaying);
                      } else {
                        playSongAt(index);
                      }
                    }}
                  >
                    <div
                      className={`song-row-minimal ${isRow ? "playing" : ""} ${isHidden ? "hidden-row" : ""}`}
                      style={{ animationDelay: `${450 + index * 40}ms` }}
                      onContextMenu={(e) => handleContextMenu(song, e, index)}
                      title="Right-click to add to playlist"
                    >
                      {isHidden && <div className="hidden-slot-glow" />}

                      <span className="song-index-minimal">
                        <span className="song-idx-number">
                          {isRow && isPlaying ? "" : String(index + 1).padStart(2, '0')}
                        </span>
                        <svg className="track-hover-icon" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                          {isRow && isPlaying ? (
                            <><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></>
                          ) : (
                            <path d="M8 5v14l11-7z" />
                          )}
                        </svg>
                        {isRow && isPlaying && (
                          <div className="track-playing-bars">
                            <div className="track-bar" />
                            <div className="track-bar" />
                            <div className="track-bar" />
                            <div className="track-bar" />
                          </div>
                        )}
                      </span>

                      <span className="song-title-minimal">
                        {song.name}
                        {isHidden && (
                          <span className="hidden-track-badge">Hidden Track</span>
                        )}
                      </span>

                      <div className="song-actions-minimal">
                        <button
                          className={`album-like-btn ${likedSongs[song.name] ? 'heart-anim-active' : ''}`}
                          onClick={(e) => { e.stopPropagation(); requireAuth(() => toggleLike(song.name, e)); }}
                          aria-label="Like"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: likedSongs[song.name] ? getHeartColor(album?.color) : 'rgba(255,255,255,0.2)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                            transition: 'color 0.2s'
                          }}
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" fill={likedSongs[song.name] ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={likedSongs[song.name] ? 0 : 2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                          </svg>
                        </button>
                        <span className="song-duration-minimal">{song.duration || songDurations[song.name] || "—"}</span>
                      </div>
                    </div>
                  </SwipeableTrack>
                );
              })}
            </div>

            <div className="album-footer-stats">
              {albumSongs.length} tracks · {album?.release?.split(' ').pop()}
            </div>
            <div style={{ marginTop: '30px', paddingBottom: '40px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', letterSpacing: '1px' }}>
              © {new Date().getFullYear()} HYBE LABELS. All rights reserved.
            </div>
          </div>
        </div>
      </div>


      {/* Create New Playlist Modal */}
      <CreatePlaylistModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onConfirm={(title, coverData, color) => {
          const newId = createPlaylist({ title, cover: coverData, color });
          setIsCreateModalOpen(false);
        }}
      />

      {/* Toast notification */}
      {addedToast && (
        <div style={{
          position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(14,14,20,0.95)', border: '1px solid rgba(255,255,255,0.1)',
          color: '#fff', padding: '10px 20px', borderRadius: '100px',
          fontSize: '13px', fontWeight: 500, zIndex: 3000,
          backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          letterSpacing: '0.3px', whiteSpace: 'nowrap'
        }}>
          ✓ Added to <strong>{addedToast.title || addedToast}</strong>
        </div>
      )}
    </>
  );
}

