import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useVelocity,
  AnimatePresence,
} from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AudioContext } from './AudioPlayerProvider';
import CreatePlaylistModal from './CreatePlaylistModal';
import PlaylistDetailModal from './PlaylistDetailModal';
import './PlaylistsPage.css';

import { groupsData } from './data/musicRegistry';

// Helper to find a song globally by name
function findSongByName(songName) {
  for (const group of Object.values(groupsData)) {
    // Search in group albums
    for (const yearGroup of (group.albums || [])) {
      for (const album of (yearGroup.albums || [])) {
        const songs = group.songs?.[album.id] || [];
        const found = songs.find(s => s.name === songName);
        if (found) {
          return {
            ...found,
            cover: found.cover || album.cover,
            albumTitle: album.title,
            member: group.title,
            filePath: `${group.basePath}${album.id}/${found.file}`
          };
        }
      }
    }
    // Search in solo albums
    for (const yearGroup of (group.soloAlbums || [])) {
      for (const album of (yearGroup.albums || [])) {
        const songs = group.soloSongs?.[album.id] || [];
        const found = songs.find(s => s.name === songName);
        if (found) {
          return {
            ...found,
            cover: found.cover || album.cover,
            albumTitle: album.title,
            member: album.member || group.title,
            filePath: `${group.soloBasePath}${found.file}`
          };
        }
      }
    }
  }
  return { name: songName, artist: 'Unknown' };
}

// ─── wrap utility (framer-motion doesn't always export it cleanly) ──
function wrap(min, max, v) {
  const range = max - min;
  return ((((v - min) % range) + range) % range) + min;
}

// ─── Layout constants ────────────────────────────────────────────
// STEP: how many pixels of baseX = one card slot along the diagonal
const STEP = 260;

// Diagonal trajectory anchor — all cards share this origin,
// then offset along both axes proportionally to their slot.
// Cards go:  bottom-left (large, front) → top-right (small, back)
const DIAG_X_PER_STEP = 220;  // px right per slot
const DIAG_Y_PER_STEP = -160;  // px up per slot

// ─── ScrambleLabel ───────────────────────────────────────────────
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·—';
function ScrambleLabel({ text, visible }) {
  const [display, setDisplay] = useState(text);
  const rafRef = useRef(null);
  const iterRef = useRef(0);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    if (!visible) { setDisplay(text); return; }
    iterRef.current = 0;
    const run = () => {
      iterRef.current += 0.7;
      setDisplay(
        text.split('').map((ch, i) =>
          i < Math.floor(iterRef.current)
            ? ch
            : CHARS[Math.floor(Math.random() * CHARS.length)]
        ).join('')
      );
      if (iterRef.current < text.length) rafRef.current = requestAnimationFrame(run);
      else setDisplay(text);
    };
    rafRef.current = requestAnimationFrame(run);
    return () => cancelAnimationFrame(rafRef.current);
  }, [visible, text]);

  return <span>{display}</span>;
}

// ─── SurfCard ────────────────────────────────────────────────────
function SurfCard({ playlist, cardIndex, total, baseX, onClick }) {
  const [hovered, setHovered] = useState(false);

  const totalWidth = total * STEP;

  // Slot position: wrap baseX offset so the card loops infinitely
  // We wrap at -1.5 * STEP so the card can slide fully off-screen 
  // to the bottom-left before teleporting to the back.
  const slotX = useTransform(baseX, v => {
    const shifted = cardIndex * STEP + v;
    return wrap(-STEP * 1.5, totalWidth - STEP * 1.5, shifted);
  });

  // Convert slot → screen position along the diagonal
  // Apply a non-linear curve to positive slots so they stack up at the back
  const getVisualSlot = (slot) => {
    // Apply sub-linear curve symmetrically to both ends (entering and exiting)
    return Math.sign(slot) * Math.pow(Math.abs(slot), 0.75);
  };

  const screenX = useTransform(slotX, v => {
    return getVisualSlot(v / STEP) * DIAG_X_PER_STEP;
  });

  const screenY = useTransform(slotX, v => {
    return getVisualSlot(v / STEP) * DIAG_Y_PER_STEP;
  });

  // Scale: grow larger as it goes negative, shrink as it goes back
  const scale = useTransform(slotX, v => {
    const slot = v / STEP;
    if (slot < 0) return 1 - slot * 0.25; // Grow larger than 1 when moving offscreen
    return Math.max(0.28, 1 - slot * (0.72 / Math.max(total - 1, 1)));
  });

  // Opacity: fade out smoothly offscreen to the left, and fade out at the very back
  const opacity = useTransform(slotX, v => {
    const slot = v / STEP;
    if (slot < -0.5) return Math.max(0, 1 + (slot + 0.5) * 2); // Fade out as it hits -1
    if (slot > total - 2) return 0; // Fade out far back
    if (slot < 0) return 1;
    return 1 - (slot / (total - 1)) * 0.15;  // very subtle fade
  });

  // zIndex: slot -1 = highest z
  const zIndex = useTransform(slotX, v => {
    const slot = Math.round(v / STEP);
    return total - slot;
  });

  const src = playlist.cover || 'https://images.unsplash.com/photo-1614680376593-902f74a1ce17?w=640';

  return (
    <motion.div
      className="surf-card-wrapper"
      style={{ x: screenX, y: screenY, scale, opacity, zIndex }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={() => onClick(playlist)}
    >
      <motion.div
        className="surf-card-inner"
        style={{ width: '100%', height: '100%', position: 'relative' }}
        whileHover={{
          y: -40, // Raise up
          rotateX: -5,
          filter: 'brightness(1.18) contrast(1.06)',
          transition: { type: 'spring', stiffness: 260, damping: 22 },
        }}
      >
        {/* Slot number badge */}
        <div className="surf-card-index">
          {String(cardIndex + 1).padStart(2, '0')}
        </div>

        {/* Polaroid-style Card */}
        <div className="surf-polaroid-card">
          <div 
            className="surf-polaroid-photo" 
            style={{ backgroundColor: playlist.color || '#C084FC' }}
          >
            {playlist.id === 'liked_songs' && (
              <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.2, color: '#fff' }}>
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            )}
          </div>
          <div className="surf-polaroid-footer">
            <span className="surf-polaroid-title">{playlist.title}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
//  HORIZONTAL 3D CAROUSEL LOGIC
// ═══════════════════════════════════════════════════════════════════════════════
const CARD_SPACING = 150;
const PX_TO_DEG   = 180 / (Math.PI * 220);
const MIN_ITEMS   = 12;

function wrapAngle(deg) {
  return ((deg + 180) % 360 + 360) % 360 - 180;
}

function Horizontal3DCard({ playlist, index, angleStepDeg, displayAngle, onClick }) {
  const θ = useTransform(displayAngle, deg => wrapAngle(index * angleStepDeg - deg));
  const xPos = useTransform(θ, a => (a / angleStepDeg) * CARD_SPACING);
  const zPos = useTransform(θ, a => -Math.abs(a / angleStepDeg) * 110);
  const rotY = useTransform(θ, a => Math.max(-55, Math.min(55, -(a / angleStepDeg) * 35)));
  const alpha = useTransform(θ, a => Math.max(0, 1 - Math.abs(a / angleStepDeg) * 0.4));
  const scl = useTransform(θ, a => Math.max(0.6, 1 - Math.abs(a / angleStepDeg) * 0.15));
  const filt = useTransform(θ, a => {
    const steps = Math.abs(a / angleStepDeg);
    const blur = Math.max(0, (steps - 1) * 2);
    const br   = Math.max(0.3, 1 - steps * 0.2);
    return blur > 0.1 ? `blur(${blur.toFixed(1)}px) brightness(${br.toFixed(2)})` : `brightness(${br.toFixed(2)})`;
  });
  const zi = useTransform(θ, a => Math.max(1, 100 - Math.round(Math.abs(a))));
  const isLiked = playlist.id === 'liked_songs';
  const color   = playlist.color || '#7c3aed';

  return (
    <motion.div className="oc-wrapper" style={{ x: xPos, z: zPos, rotateY: rotY, scale: scl, opacity: alpha, filter: filt, zIndex: zi }} onClick={() => onClick(playlist)}>
      <motion.div className="oc-breathe" animate={{ y: [0, -5, 0] }} transition={{ duration: 5.4, repeat: Infinity, ease: 'easeInOut', repeatType: 'mirror', delay: index * 0.7 }}>
        <div className="oc-panel">
          <div className="oc-cover" style={{ background: color }}>
            <div className="oc-cover-icon">
              {isLiked ? (
                <svg width="52" height="52" viewBox="0 0 24 24" fill="white" opacity="0.18"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              ) : (
                <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" opacity="0.18"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
              )}
            </div>
          </div>
          <div className="oc-polaroid-footer">
            <span className="oc-polaroid-title">{playlist.title}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Horizontal3DCarousel({ playlists, onOpen }) {
  const base = playlists.length;
  const orbit = [];
  if (base > 0) {
    let r = 0;
    while (orbit.length < Math.max(base, MIN_ITEMS)) {
      playlists.forEach((p, i) => orbit.push({ ...p, _k: `${p.id}-${r}-${i}`, _ri: i % base }));
      r++;
    }
  }
  const total = orbit.length;
  const angleStepDeg = 360 / total;
  const displayAngle = useSpring(0, { stiffness: 120, damping: 20, mass: 1 });
  const targetAngle  = React.useRef(0);
  const [selIdx,  setSelIdx]  = useState(0);
  const [bgColor, setBgColor] = useState(playlists[0]?.color ?? '#6d28d9');
  const lastX    = React.useRef(0);
  const isDrag   = React.useRef(false);
  const dragDist = React.useRef(0);
  const velRef   = React.useRef(0);

  useEffect(() => {
    return displayAngle.onChange(v => {
      const idx = ((Math.round(v / angleStepDeg) % total) + total) % total;
      const ri  = orbit[idx]?._ri ?? 0;
      setSelIdx(ri);
      setBgColor(playlists[ri]?.color ?? '#6d28d9');
    });
  }, [displayAngle, angleStepDeg, total, orbit, playlists]);

  const snapToNearest = useCallback(() => {
    const flingDeg = velRef.current * 8;
    targetAngle.current = Math.round((targetAngle.current + flingDeg) / angleStepDeg) * angleStepDeg;
    displayAngle.set(targetAngle.current);
  }, [displayAngle, angleStepDeg]);

  const onDown = useCallback((e) => {
    isDrag.current   = true;
    dragDist.current = 0;
    velRef.current   = 0;
    targetAngle.current = displayAngle.get();
    lastX.current    = e.clientX ?? e.touches?.[0]?.clientX;
    e.currentTarget?.setPointerCapture?.(e.pointerId);
  }, [displayAngle]);

  const onMove = useCallback((e) => {
    if (!isDrag.current) return;
    const cx = e.clientX ?? e.touches?.[0]?.clientX;
    const dx = cx - lastX.current;
    dragDist.current += Math.abs(dx);
    velRef.current = velRef.current * 0.7 + (-dx * PX_TO_DEG) * 0.3;
    targetAngle.current -= dx * PX_TO_DEG;
    displayAngle.set(targetAngle.current);
    lastX.current = cx;
  }, [displayAngle]);

  const onUp = useCallback(() => {
    if (!isDrag.current) return;
    isDrag.current = false;
    snapToNearest();
  }, [snapToNearest]);

  const handleOpen = useCallback((clickedPlaylist) => {
    if (dragDist.current > 8) return;
    onOpen(clickedPlaylist || playlists[selIdx]);
  }, [onOpen, playlists, selIdx]);

  const handleWheel = useCallback((e) => {
    const dx = e.deltaX || e.deltaY;
    velRef.current = velRef.current * 0.7 + (dx * PX_TO_DEG) * 0.3;
    targetAngle.current += dx * PX_TO_DEG * 1.5;
    displayAngle.set(targetAngle.current);
    if (window.snapTimeout) clearTimeout(window.snapTimeout);
    window.snapTimeout = setTimeout(() => snapToNearest(), 150);
  }, [displayAngle, snapToNearest]);

  const sel = playlists[selIdx];

  return (
    <div className="ot-scene" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp} onWheel={handleWheel} style={{ touchAction: 'none' }}>
      <div className="ot-nebula" />
      <AnimatePresence>
        <motion.div key={`wash-${selIdx}`} className="ot-wash" style={{ '--wash': bgColor }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.1 }} />
      </AnimatePresence>
      <AnimatePresence>
        <motion.div key={`bloom-${selIdx}`} className="ot-bloom" style={{ background: bgColor }} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 0.18, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} transition={{ duration: 0.85 }} />
      </AnimatePresence>
      <div className="ot-stage">
        {orbit.map((p, i) => (
          <Horizontal3DCard key={p._k} playlist={p} index={i} angleStepDeg={angleStepDeg} displayAngle={displayAngle} onClick={handleOpen} />
        ))}
      </div>
      <div className="ot-fog ot-fog--left" />
      <div className="ot-fog ot-fog--right" />
      <div className="ot-vignette" />
      <AnimatePresence mode="wait">
        <motion.div key={`info-${selIdx}`} className="ot-info" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
          <p className="ot-info-name">{sel?.title}</p>
          <p className="ot-info-meta">{sel?.songs?.length ?? 0}&nbsp;{(sel?.songs?.length ?? 0) === 1 ? 'song' : 'songs'}</p>
        </motion.div>
      </AnimatePresence>
      <p className="ot-hint">SWIPE TO SPIN &bull; TAP TO OPEN</p>
    </div>
  );
}

// ─── PlaylistsPage ───────────────────────────────────────────────
export default function PlaylistsPage() {
  const { userPlaylists, createPlaylist, likedSongs } = useContext(AudioContext);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // baseX: raw accumulated scroll offset (grows as user drags/scrolls)
  const baseX = useMotionValue(0);
  // Smooth it so cards ease into position
  const smoothBaseX = useSpring(baseX, { stiffness: 180, damping: 28, mass: 0.6 });

  const lastPointerRef = useRef(null);
  const isDragging = useRef(false);

  // ── Wheel ─────────────────────────────────────────────────────
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    // Both horizontal and vertical wheel scroll the deck
    baseX.set(baseX.get() - e.deltaX - e.deltaY * 0.6);
  }, [baseX]);

  // ── Pointer drag ──────────────────────────────────────────────
  const dragDistance = useRef(0);

  const handlePointerDown = useCallback((e) => {
    isDragging.current = true;
    dragDistance.current = 0;
    lastPointerRef.current = e.clientX;
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!isDragging.current) return;
    const delta = e.clientX - lastPointerRef.current;
    dragDistance.current += Math.abs(delta);
    baseX.set(baseX.get() - delta); // drag left = scroll forward
    lastPointerRef.current = e.clientX;
  }, [baseX]);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
    lastPointerRef.current = null;
  }, []);

  const sceneRef = useRef(null);
  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Modal scroll lock
  useEffect(() => {
    document.body.style.overflow = (isCreateModalOpen || selectedPlaylist) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isCreateModalOpen, selectedPlaylist]);

  const handleCardClick = useCallback((playlist) => {
    if (dragDistance.current > 5) return; // Ignore click if we were dragging
    setSelectedPlaylist(playlist);
  }, []);

  const rawPlaylists = userPlaylists ?? [];
  
  // Construct the permanent Liked Songs playlist
  const likedSongsArray = Object.entries(likedSongs || {}).map(([songName, val]) => {
    // If it's a full valid object (modern format)
    if (typeof val === 'object' && val !== null && val.name && val.filePath) {
      return val;
    }
    // If it's an array index (legacy), songName is actually an index, and val is the string.
    if (typeof val === 'string') {
      return findSongByName(val);
    }
    // Legacy boolean map format
    return findSongByName(songName);
  });

  const likedPlaylist = {
    id: 'liked_songs',
    title: 'Liked Songs',
    tracks: likedSongsArray.length,
    songs: likedSongsArray,
    cover: null,
    color: '#EF4444' // Red
  };

  const basePlaylists = [likedPlaylist, ...rawPlaylists];

  // Pad to at least 12 cards so the deck always looks lush
  const MIN_CARDS = 12;
  const loopCount = basePlaylists.length > 0
    ? Math.ceil(MIN_CARDS / basePlaylists.length)
    : 0;
  const displayPlaylists = [];
  for (let i = 0; i < loopCount; i++) {
    basePlaylists.forEach((p, pIdx) =>
      displayPlaylists.push({ ...p, uniqueId: `${p.id}-${i}-${pIdx}` })
    );
  }
  const total = displayPlaylists.length;

  return (
    <div className="playlists-surf-container">
      {/* ═══════ MOBILE ═════════════════════════════════════════ */}
      {isMobile && (
        <div className="playlists-mobile-root" style={{ height: '100vh', width: '100vw' }}>
          <div className="mob-header">
            <button className="mob-back" onClick={() => navigate(-1)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
              </svg>
            </button>
            <div className="mob-title-wrap">
              <h1 className="mob-title">Playlists</h1>
              <span className="mob-count">{basePlaylists.length}</span>
            </div>
            <button className="mob-add" onClick={() => setIsCreateModalOpen(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>
          <Horizontal3DCarousel playlists={basePlaylists} onOpen={p => setSelectedPlaylist(p)} />
          {basePlaylists.length === 0 && (
            <div className="mob-empty" style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ opacity: 0.18 }}>
                <path d="M9 18V5l12-2v13" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
              </svg>
              <p>No playlists yet</p>
              <button onClick={() => setIsCreateModalOpen(true)} className="mob-create-btn">Create Playlist</button>
            </div>
          )}
        </div>
      )}

      {/* ═══════ DESKTOP ════════════════════════════════════════ */}
      {!isMobile && (
        <div
          ref={sceneRef}
          className="surf-scene"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{ cursor: isDragging.current ? 'grabbing' : 'grab' }}
        >
        {/* Title */}
        <div className="surf-title-block">
          <button className="surf-back-btn" onClick={() => navigate(-1)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            BACK
          </button>
          <h1 className="surf-title">
            YOUR PLAYLISTS
            <span className="surf-title-count">({basePlaylists.length})</span>
          </h1>
          <button className="surf-create-btn" onClick={() => setIsCreateModalOpen(true)}>
            + New Playlist
          </button>
        </div>

        {basePlaylists.length > 0 && (
          <div className="surf-footer">DRAG · SCROLL · SURF</div>
        )}

        {/* Cards */}
        {basePlaylists.length > 0 ? (
          displayPlaylists.map((playlist, i) => (
            <SurfCard
              key={playlist.uniqueId}
              playlist={playlist}
              cardIndex={i}
              total={total}
              baseX={smoothBaseX}
              onClick={handleCardClick}
            />
          ))
        ) : (
          <div className="surf-empty">
            <p>No playlists yet. Create one to start surfing.</p>
          </div>
        )}
      </div>

      )}
      
      <CreatePlaylistModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onConfirm={(title, coverData, color) => {
          createPlaylist({ title, cover: coverData, color });
          setIsCreateModalOpen(false);
        }}
      />

      <PlaylistDetailModal
        playlist={selectedPlaylist}
        isOpen={!!selectedPlaylist}
        onClose={() => setSelectedPlaylist(null)}
      />
    </div>
  );
}