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

// ─── PlaylistsPage ───────────────────────────────────────────────
export default function PlaylistsPage() {
  const { userPlaylists, createPlaylist, likedSongs } = useContext(AudioContext);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const navigate = useNavigate();

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