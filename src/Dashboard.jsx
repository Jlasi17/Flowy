import { useState, useContext, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AudioContext } from "./AudioPlayerProvider";
import SearchOverlay from "./components/SearchOverlay";
import FastScrollHandle from "./components/FastScrollHandle";
import "./Dashboard.css";
import "./DashboardMobile.css";
import { groupsData } from "./data/musicRegistry";

const groupsMeta = groupsData;

function getContrastYIQ(hexcolor) {
  if (!hexcolor) return 'white';
  hexcolor = hexcolor.replace("#", "");
  var r = parseInt(hexcolor.slice(0, 2), 16);
  var g = parseInt(hexcolor.slice(2, 4), 16);
  var b = parseInt(hexcolor.slice(4, 6), 16);
  var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#111' : '#fff';
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { groupId } = useParams();
  const meta = groupsMeta[groupId] || groupsMeta.bts;

  const allAlbums = (meta.albums || []).flatMap((block) =>
    (block.albums || []).map((a) => ({ ...a, year: block.year }))
  );

  const allSoloAlbums = (meta.soloAlbums || []).flatMap((memberBlock) =>
    (memberBlock.albums || []).map((a) => ({ ...a, member: memberBlock.member }))
  );

  // Normalize tab based on whether group has solos
  const sessionTab = sessionStorage.getItem(`${groupId}DashboardTab`) || "group";
  const initialTab = meta.hasSolos ? sessionTab : "group";
  const [tab, setTab] = useState(initialTab);
  
  const [active, setActive] = useState(() => Number(sessionStorage.getItem(`${groupId}DashboardActiveIndex`) || 0));
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);

  const [soloistIdx, setSoloistIdx] = useState(() => Number(sessionStorage.getItem(`${groupId}DashboardSoloIdx`) || 0));

  const prevSoloist = () => { setSoloistIdx(p => (p - 1 + meta.soloists.length) % meta.soloists.length); setActive(0); };
  const nextSoloist = () => { setSoloistIdx(p => (p + 1) % meta.soloists.length); setActive(0); };

  // Sync state to memory
  useEffect(() => {
    sessionStorage.setItem(`${groupId}DashboardTab`, tab);
  }, [tab]);

  useEffect(() => {
    sessionStorage.setItem(`${groupId}DashboardActiveIndex`, active);
  }, [active, groupId]);

  useEffect(() => {
    sessionStorage.setItem(`${groupId}DashboardSoloIdx`, soloistIdx);
  }, [soloistIdx, groupId]);

  // Track mobile breakpoint
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Re-read sessionStorage when search closes (artist may have been selected)
  useEffect(() => {
    if (!isSearchOpen) {
      const storedTab = sessionStorage.getItem(`${groupId}DashboardTab`) || "group";
      const storedActive = Number(sessionStorage.getItem(`${groupId}DashboardActiveIndex`) || 0);
      const storedSoloIdx = Number(sessionStorage.getItem(`${groupId}DashboardSoloIdx`) || 0);
      if (meta.hasSolos && storedTab !== tab) setTab(storedTab);
      if (storedActive !== active) setActive(storedActive);
      if (storedSoloIdx !== soloistIdx) setSoloistIdx(storedSoloIdx);
    }
  }, [isSearchOpen, groupId, meta.hasSolos]);

  const { setSongs, setAlbumData, setAlbumId, setCurrentIndex, setIsPlaying, albumData, isPlaying, activeSong } =
    useContext(AudioContext);

  const albums = tab === "solos" && meta.hasSolos
    ? allSoloAlbums.filter(a => a.member === meta.soloists[soloistIdx]) 
    : allAlbums;
  const current = albums[active] || null;

  // Keyboard nav
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") setActive((p) => Math.min(p + 1, albums.length - 1));
      if (e.key === "ArrowLeft") setActive((p) => Math.max(p - 1, 0));
      if (e.key === "Enter" && current) handleNavigate(current.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [albums.length, current]);

  const handleNavigate = (albumId) => {
    if (!document.startViewTransition) {
      navigate(`/album/${albumId}`);
      return;
    }
    document.startViewTransition(() => {
      navigate(`/album/${albumId}`);
    });
  };

  // Swipe / drag
  const swipeThreshold = isMobile ? 35 : 60;
  const onPointerDown = (e) => { setDragging(true); setDragStart(e.clientX); };
  const onPointerUp = (e) => {
    if (!dragging) return;
    const dx = dragStart - e.clientX;
    if (dx > swipeThreshold) setActive((p) => Math.min(p + 1, albums.length - 1));
    if (dx < -swipeThreshold) setActive((p) => Math.max(p - 1, 0));
    setDragging(false);
  };

  const playAlbum = (album, e) => {
    e?.stopPropagation();
    const isSolo = tab === "solos" && meta.hasSolos;
    const currentBasePath = isSolo ? meta.soloBasePath : meta.basePath;
    const songs = (isSolo ? meta.soloSongs[album.id] : meta.songs[album.id]) || [];
    
    if (!songs.length) return;
    
    setSongs(songs.map((s) => ({
      name: s.name,
      filePath: isSolo ? `${currentBasePath}${s.file}` : `${currentBasePath}${album.id}/${s.file}`,
      cover: album.cover,
      member: meta.title,
      albumTitle: album.title,
      color: album.color
    })));
    
    setAlbumData({ ...album, member: meta.title });
    setAlbumId(album.id);
    setCurrentIndex(0);
    setIsPlaying(true);
  };

  const isCurrentlyPlaying = albumData?.id === current?.id && isPlaying;

  // Position helpers
  const getCardStyle = (i) => {
    const offset = i - active;
    const absOff = Math.abs(offset);
    if (absOff > 6) return { display: "none" };

    const sign = Math.sign(offset);

    // FIX: 0 degrees for the active album so it faces us.
    // Flanks angled at 45 degrees.
    let rotateY = sign === 0 ? 0 : -sign * 45;
    const translateZ = sign === 0 ? 150 : -absOff * 100;
    let translateX = sign === 0 ? 0 : sign * (80 + absOff * 60);
    const zIndex = 100 - absOff;

    let opacity = 1;
    if (absOff > 4) opacity = Math.max(0, 1 - (absOff - 4) * 0.3);

    return {
      transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg)`,
      opacity,
      zIndex,
    };
  };

  // Whether the mini-player is visible (to adjust info panel spacing)
  const isPlayerVisible = !!activeSong;

  return (
    <div className="db-root">
      {/* Ambient background blobs */}
      <div className="db-bg">
        <div className="blob blob-1" style={current ? { backgroundImage: `url(${current.cover})` } : {}} />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
        <div className="db-noise" />
      </div>

      {/* ── TOP BAR ── */}
      <header className="db-header">
        <button className="db-back" onClick={() => navigate("/")} aria-label="Back to home">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <div className="db-header-center">
          {meta.hasSolos ? (
            <div className="db-toggle-dock">
              <button
                className={`db-toggle-btn ${tab === 'group' ? 'active' : ''}`}
                onClick={() => { setTab('group'); setActive(0); }}
              >
                {meta.title}
              </button>
              <button
                className={`db-toggle-btn ${tab === 'solos' ? 'active' : ''}`}
                onClick={() => { setTab('solos'); setActive(0); }}
              >
                SOLOS
              </button>
            </div>
          ) : (
            <h1 className="db-group-title-static">{meta.title}</h1>
          )}
        </div>
        <div className="db-header-right">
          <button className="db-icon-btn" aria-label="Search" onClick={() => setIsSearchOpen(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          </button>
        </div>
      </header>

      {/* ── SOLOIST SELECTOR ── */}
      {meta.hasSolos && tab === "solos" && (
        <div className="soloist-selector">
          <button onClick={prevSoloist}>&lt;</button>
          <span>{meta.soloists[soloistIdx]}</span>
          <button onClick={nextSoloist}>&gt;</button>
        </div>
      )}

      {/* ── CAROUSEL STAGE ── */}
      {albums.length === 0 ? (
        <div className="db-coming-soon">
          <div className="cs-card">
            <h2>{tab === 'solos' ? 'Solos' : meta.title}</h2>
            <p>Albums coming soon — explore BTS Group in the meantime!</p>
            <button className="cs-btn" onClick={() => { setTab('bts'); navigate("/dashboard/bts"); }}>Explore BTS →</button>
          </div>
        </div>
      ) : (
        <>
          <div
            className="db-stage"
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerLeave={() => setDragging(false)}
          >
            <div className="db-carousel">
              {albums.map((album, i) => (
                <div
                  key={album.id}
                  className={`db-card ${i === active ? "db-card--active" : ""}`}
                  style={getCardStyle(i)}
                  onClick={() => {
                    if (i === active) handleNavigate(album.id);
                    else setActive(i);
                  }}
                  role="button"
                  aria-label={i === active ? `Open ${album.title}` : `Select ${album.title}`}
                >
                  {/* The 3D Object Container */}
                  <div className="db-card-3d-object">
                    {/* Front Face */}
                    <img
                      src={album.cover}
                      alt={album.title}
                      className="db-card-face db-card-front"
                      draggable={false}
                      style={{ viewTransitionName: i === active ? 'album-hero' : 'none' }}
                    />

                    {/* Back Face */}
                    <img src={album.cover} alt={album.title} className="db-card-face db-card-back" draggable={false} />

                    {/* Spines (Thickness of the album) */}
                    <div
                      className="db-card-face db-card-spine--left"
                      style={{ background: album.color || '#2a2a2a' }}
                    >
                      <span className="db-spine-text" style={{ color: getContrastYIQ(album.color) }}>
                        {album.title}
                      </span>
                    </div>
                    <div
                      className="db-card-face db-card-spine--right"
                      style={{ background: album.color || '#2a2a2a' }}
                    >
                      <span className="db-spine-text" style={{ color: getContrastYIQ(album.color) }}>
                        {album.title}
                      </span>
                    </div>

                    {/* Top & Bottom edges to close the box */}
                    <div className="db-card-face db-card-spine--top" />
                    <div className="db-card-face db-card-spine--bottom" />
                  </div>

                  {/* Reflection */}
                  <div className="db-card-reflection" style={{ backgroundImage: `url(${album.cover})` }} />

                  {/* Shine on active */}
                  {i === active && <div className="db-card-shine" />}
                </div>
              ))}
            </div>

            {/* Carousel nav arrows */}
            <button
              className="db-arrow db-arrow--left"
              onClick={() => setActive((p) => Math.max(p - 1, 0))}
              disabled={active === 0}
              aria-label="Previous album"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button
              className="db-arrow db-arrow--right"
              onClick={() => setActive((p) => Math.min(p + 1, albums.length - 1))}
              disabled={active === albums.length - 1}
              aria-label="Next album"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>

            {/* Dots */}
            <div 
              className="db-dots"
              style={{ touchAction: 'none' }} /* Prevent page scroll while scrubbing */
              onPointerMove={(e) => {
                if (e.pointerType === 'mouse' && e.buttons !== 1) return;
                const el = document.elementFromPoint(e.clientX, e.clientY);
                if (el && el.hasAttribute('data-index')) {
                  const idx = parseInt(el.getAttribute('data-index'), 10);
                  if (idx !== active) setActive(idx);
                }
              }}
              onTouchMove={(e) => {
                const touch = e.touches[0];
                const el = document.elementFromPoint(touch.clientX, touch.clientY);
                if (el && el.hasAttribute('data-index')) {
                  const idx = parseInt(el.getAttribute('data-index'), 10);
                  if (idx !== active) setActive(idx);
                }
              }}
            >
              {albums.map((_, i) => (
                <button
                  key={i}
                  data-index={i}
                  className={`db-dot ${i === active ? "db-dot--on" : ""}`}
                  onClick={() => setActive(i)}
                  aria-label={`Go to album ${i + 1}`}
                />
              ))}
            </div>

            {/* Fast-scroll handle — mobile only */}
            <FastScrollHandle
              total={albums.length}
              current={active}
              onIndex={setActive}
            />
          </div>

          {/* ── INFO PANEL ── */}
          {current && (
            <div className={`db-info ${isPlayerVisible ? 'db-info--player-visible' : ''}`} key={current.id}>
              <div className="db-info-top">
                <div className="db-info-text">
                  <div className="db-info-year">{current.year || current.member} · {current.type}</div>
                  <h1 className="db-info-title">{current.title}</h1>
                  <div className="db-info-sub">
                    <span>{current.member || "BTS"}</span>
                    <span className="db-dot-sep">·</span>
                    <span>{current.titleSong}</span>
                    {current.rank && (
                      <>
                        <span className="db-dot-sep">·</span>
                        <span>#{current.rank} chart</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="db-info-actions">
                  <button
                    className={`db-play-btn ${isCurrentlyPlaying ? "db-play-btn--pause" : ""}`}
                    onClick={(e) => {
                      e?.stopPropagation();
                      if (albumData?.id === current?.id) {
                        setIsPlaying(!isPlaying);
                      } else {
                        playAlbum(current, e);
                      }
                    }}
                    aria-label={isCurrentlyPlaying ? "Pause" : "Play album"}
                  >
                    {isCurrentlyPlaying ? (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
                    )}
                  </button>
                </div>
              </div>

            </div>
          )}
        </>
      )}

      {/* ── FOOTER COPYRIGHT ── */}
      <div className="db-footer" style={{ position: 'absolute', bottom: '8px', width: '100%', textAlign: 'center', fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none', zIndex: 0, fontFamily: 'Inter, sans-serif', letterSpacing: '1px' }}>
        © {new Date().getFullYear()} HYBE LABELS. All rights reserved.
      </div>

      {/* ── SEARCH OVERLAY ── */}
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
}