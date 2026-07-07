import { useContext, useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AudioContext } from "./AudioPlayerProvider";
import MaximizedPlayer from "./MaximizedPlayer";
import QueuePanel from "./components/QueuePanel";
import FlyToQueue from "./components/FlyToQueue";
import RadialVolumeControl from "./components/RadialVolumeControl";
import PlayPauseAnimButton from "./components/PlayPauseAnimButton";
import LyricsPanel from "./components/LyricsPanel";
import KaraokePanel from "./components/KaraokePanel";
import { getHeartColor } from "./utils/singerColors";
import "./musicplayer.css";
import { useAuth } from "./contexts/AuthContext";

const MarqueeText = ({ text, className }) => {
  const isOverflowing = text?.length > 25;

  return (
    <div className={`marquee-container ${isOverflowing ? 'is-overflowing' : ''}`}>
      <div className={`marquee-inner ${className} ${isOverflowing ? 'marquee-scroll' : ''}`}>
        <span className="mq-part">{text}</span>
        {isOverflowing && <span className="mq-part">{text}</span>}
      </div>
    </div>
  );
};

const AudioWaveform = ({ isPlaying, color }) => (
  <div className={`audio-waveform ${isPlaying ? 'playing' : ''}`}>
    <div className="bar" style={{ backgroundColor: color }}></div>
    <div className="bar" style={{ backgroundColor: color }}></div>
    <div className="bar" style={{ backgroundColor: color }}></div>
    <div className="bar" style={{ backgroundColor: color }}></div>
  </div>
);

export default function PersistentAudioPlayer() {
  const {
    audioRef,
    albumData,
    isPlaying,
    setIsPlaying,
    currentTime,
    activeSong,
    isQueueOpen,
    setIsQueueOpen,
    toastMessage,
    playNext,
    playPrev,
    shuffleMode,
    toggleShuffle,
    repeatMode,
    cycleRepeat,
    flyAnimData,
    setFlyAnimData,
    queueBtnRef,
    mobileQueueBtnRef,
    volume,
    updateVolume,
    karaokeMode,
    startKaraoke,
    cancelKaraoke,
    isKaraokeMinimized,
    isCinematicActive,
    karaokeStatus,
    karaokeProgress,
    setKaraokeVocalsUrl,
    vocalVolume,
    setVocalVolume,
    instVolume,
    setInstVolume,
    likedSongs,
    toggleLike,
    requireAuth,
    isMaximized,
    setIsMaximized
  } = useContext(AudioContext);

  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState('next');

  const lastVolumeRef = useRef(volume || 80);
  const touchStartRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const isDynamicIslandPage = location.pathname === '/' || location.pathname === '/auth' || location.pathname === '/profile' || location.pathname === '/playlists' || location.pathname === '/settings';



  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      switch (e.key.toLowerCase()) {
        case 'escape':
          e.preventDefault();
          setIsMaximized(false);
          setIsLyricsOpen(false);
          break;
        case 'f':
          e.preventDefault();
          setIsMaximized(prev => !prev);
          setIsLyricsOpen(false);
          break;
        case 'l':
          e.preventDefault();
          requireAuth(() => {
            setIsLyricsOpen(prev => !prev);
            setIsMaximized(false);
          });
          break;
        case ' ': // spacebar
          e.preventDefault();
          setIsPlaying(!isPlaying);
          break;
        case 'arrowright':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            if (isCinematicActive) return;
            playNext();
          } else if (isLyricsOpen) {
            e.preventDefault();
            if (audioRef.current) {
              audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 5, audioRef.current.duration);
            }
          }
          break;
        case 'arrowleft':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            if (isCinematicActive) return;
            playPrev();
          } else if (isLyricsOpen) {
            e.preventDefault();
            if (audioRef.current) {
              audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 5, 0);
            }
          }
          break;
        case 'arrowup':
          e.preventDefault();
          updateVolume(Math.min(volume + 5, 100));
          break;
        case 'arrowdown':
          e.preventDefault();
          updateVolume(Math.max(volume - 5, 0));
          break;
        case 'm':
          if (volume > 0) {
            lastVolumeRef.current = volume;
            updateVolume(0);
          } else {
            updateVolume(lastVolumeRef.current || 80);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, volume, updateVolume, setIsPlaying, audioRef, isLyricsOpen, playNext, playPrev, requireAuth, isCinematicActive]);

  if (!activeSong) return null;

  const formatTime = (time) => {
    if (!time || isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const handleSeek = (e) => {
    if (!audioRef.current?.duration) return;
    audioRef.current.currentTime = (Number(e.target.value) / 100) * audioRef.current.duration;
  };

  const handleVolume = (e) => {
    const val = Number(e.target.value);
    // Let global context update both react state and audioref
    updateVolume(val);
  };

  const getSafeAccentColor = (colorStr) => {
    const fallback = "#1db954";
    if (!colorStr) return fallback;

    let r, g, b;
    if (colorStr.startsWith('rgb') || colorStr.startsWith('rgba')) {
      const match = colorStr.match(/\d+/g);
      if (match && match.length >= 3) {
        [r, g, b] = match.map(Number);
      }
    } else if (colorStr.startsWith('#')) {
      let hex = colorStr.replace('#', '');
      if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
      if (hex.length >= 6) {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
      }
    }
    
    if (r !== undefined) {
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (luma < 60) {
        const factor = luma < 20 ? 0.7 : (luma < 40 ? 0.5 : 0.3);
        r = Math.floor(r + (255 - r) * factor);
        g = Math.floor(g + (255 - g) * factor);
        b = Math.floor(b + (255 - b) * factor);
        return `rgb(${r}, ${g}, ${b})`;
      }
    }
    return colorStr;
  };

  const accentColor = getSafeAccentColor(albumData?.color);
  const duration = audioRef.current?.duration || 0;
  const progress = duration ? (currentTime / duration) * 100 : 0;

  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    if (e.target.closest('button') || e.target.tagName.toLowerCase() === 'input') return;
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() };
  };

  const handleTouchEnd = (e) => {
    if (!touchStartRef.current) return;
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        setSwipeDirection('next');
        playNext();
      } else {
        setSwipeDirection('prev');
        playPrev();
      }
    } else if (deltaY < -40 && Math.abs(deltaY) > Math.abs(deltaX)) {
      setIsMaximized(true); // Swipe up to maximize
    }
  };

  return (
    <>
      <div
        className={`audio-player ${isPlaying ? "active" : ""} ${isDynamicIslandPage ? 'dynamic-island-mode' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ '--accent-color': accentColor }}
      >

        {/* ── LEFT: disc + song info ── */}
        <div
          className="player-left"
          onClick={() => setIsMaximized(true)}
          style={{ cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center' }}
          title="Open Maximized Player"
        >
          <AnimatePresence mode="popLayout" initial={false} custom={swipeDirection}>
            <motion.div
              key={activeSong?.id || activeSong?.name}
              custom={swipeDirection}
              initial={(d) => ({ opacity: 0, x: d === 'next' ? 60 : -60 })}
              animate={{ opacity: 1, x: 0 }}
              exit={(d) => ({ opacity: 0, x: d === 'next' ? -60 : 60, transition: { duration: 0.2 } })}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '16px' }}
            >
              <div className={`disc ${isPlaying ? "rotate" : ""}`}>
                <img src={activeSong?.cover || albumData?.cover} alt="album art" />
              </div>

              <div className="song-info">
                <MarqueeText
                  text={activeSong?.name || ""}
                  className="song-title-mini"
                />
                <div className="song-album-mini">{albumData?.title} · {albumData?.member}</div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── CENTER: controls + scrubber ── */}
        <div className="player-center">
          <div className="player-controls">
            <button
              className={`ctrl-btn ctrl-mode-btn btn-shuffle skip-btn ${shuffleMode ? 'ctrl-active' : ''}`}
              onClick={toggleShuffle}
              aria-label="Shuffle"
              title={shuffleMode ? 'Shuffle on' : 'Shuffle off'}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
              </svg>
            </button>
            <button className="ctrl-btn skip-btn" onClick={playPrev} aria-label="Previous">⏮</button>

            <button
              className="ctrl-btn mobile-queue-btn"
              ref={mobileQueueBtnRef}
              onClick={(e) => {
                e.stopPropagation();
                requireAuth(() => setIsQueueOpen(!isQueueOpen));
              }}
              aria-label="Queue"
              style={{ color: isQueueOpen ? '#1db954' : '#fff' }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h12v2H4z" />
              </svg>
            </button>

            <button
              className="ctrl-btn mobile-lyrics-btn"
              onClick={(e) => {
                e.stopPropagation();
                requireAuth(() => setIsLyricsOpen(true));
              }}
              aria-label="Lyrics"
              title="Show Lyrics"
              style={{ color: isLyricsOpen ? '#1db954' : '#fff' }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20,16a2.9,2.9,0,0,0-3-3v6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                <path d="M17,19a2,2,0,1,1-2-2A2,2,0,0,1,17,19ZM8,11h5M8,15h3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                <path d="M9,19H5a1,1,0,0,1-1-1V4A1,1,0,0,1,5,3H16a1,1,0,0,1,1,1V9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              </svg>
            </button>

            <PlayPauseAnimButton
              isPlaying={isPlaying}
              onClick={() => setIsPlaying(!isPlaying)}
              className="ctrl-btn play-pause premium-anim-override"
            />

            <button className="ctrl-btn skip-btn" onClick={playNext} aria-label="Next">⏭</button>
            <button
              className={`ctrl-btn ctrl-mode-btn btn-repeat skip-btn ${repeatMode !== 'off' ? 'ctrl-active' : ''}`}
              onClick={cycleRepeat}
              aria-label="Repeat"
              title={repeatMode === 'off' ? 'Repeat off' : repeatMode === 'all' ? 'Repeat all' : 'Repeat one'}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
              </svg>
              {repeatMode === 'one' && <span className="repeat-one-badge">1</span>}
            </button>
          </div>

          <div className="dynamic-island-waveform" onClick={() => setIsMaximized(true)}>
            <AudioWaveform isPlaying={isPlaying} color={accentColor} />
          </div>

          <div className="time-bar">
            <span>{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={handleSeek}
              aria-label="Seek"
              style={{
                background: `linear-gradient(to right, ${accentColor} ${progress}%, rgba(255, 255, 255, 0.2) ${progress}%)`
              }}
            />
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* ── RIGHT: volume ── */}
        <div className="player-right">
          <RadialVolumeControl
            volume={volume}
            onVolumeChange={handleVolume}
          />
          {/* Like Button */}
          <button
            className={`like-btn ${activeSong && likedSongs[activeSong.name] ? 'heart-anim-active' : ''}`}
            onClick={(e) => activeSong && requireAuth(() => toggleLike(activeSong.name, e))}
            aria-label="Like"
            title="Like Song"
            style={{
              background: 'transparent',
              border: 'none',
              color: activeSong && likedSongs[activeSong.name] ? getHeartColor(albumData?.color) : 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
              marginLeft: '8px',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.2s ease',
            }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill={activeSong && likedSongs[activeSong.name] ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={activeSong && likedSongs[activeSong.name] ? 0 : 2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>
          {/* Mic / Lyrics button */}
          <button
            onClick={() => requireAuth(() => setIsLyricsOpen(true))}
            aria-label="Lyrics"
            title="Show Lyrics"
            style={{
              background: 'transparent',
              border: 'none',
              color: isLyricsOpen ? '#1db954' : '#fff',
              cursor: 'pointer',
              marginLeft: '4px',
              opacity: isLyricsOpen ? 1 : 0.65,
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.2s ease',
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20,16a2.9,2.9,0,0,0-3-3v6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              <path d="M17,19a2,2,0,1,1-2-2A2,2,0,0,1,17,19ZM8,11h5M8,15h3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              <path d="M9,19H5a1,1,0,0,1-1-1V4A1,1,0,0,1,5,3H16a1,1,0,0,1,1,1V9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            </svg>
          </button>
          <button
            className="queue-btn"
            ref={queueBtnRef}
            onClick={() => requireAuth(() => setIsQueueOpen(!isQueueOpen))}
            aria-label="Queue"
            style={{ background: 'transparent', border: 'none', color: isQueueOpen ? '#1db954' : '#fff', cursor: 'pointer', marginLeft: '12px', opacity: isQueueOpen ? 1 : 0.7 }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h12v2H4z" />
            </svg>
          </button>
          <button
            className="maximize-btn"
            onClick={() => setIsMaximized(true)}
            aria-label="Maximize"
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: '12px', opacity: 0.7 }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
            </svg>
          </button>
        </div>
      </div>

      {isQueueOpen && <QueuePanel onClose={() => setIsQueueOpen(false)} />}
      {isMaximized && <MaximizedPlayer onClose={() => setIsMaximized(false)} />}
      {isLyricsOpen && !karaokeMode && <LyricsPanel onClose={() => setIsLyricsOpen(false)} />}
      {karaokeMode && !isKaraokeMinimized && (
        <KaraokePanel onClose={() => {
          // No longer needed to set isKaraokeOpen(false)
        }} />
      )}

      {flyAnimData && (
        <FlyToQueue
          sourceRect={flyAnimData.sourceRect}
          targetRect={flyAnimData.targetRect}
          songName={flyAnimData.songName}
          cover={flyAnimData.cover}
          onComplete={() => setFlyAnimData(null)}
        />
      )}

      {toastMessage && (
        <div
          className="queue-toast"
          style={{
            background: toastMessage.color
              ? `linear-gradient(135deg, rgba(30,30,30,0.95) 0%, ${toastMessage.color.replace(')', ', 0.3)').replace('rgb', 'rgba')} 100%)`
              : "rgba(30, 30, 30, 0.85)"
          }}
        >
          {toastMessage.message}
        </div>
      )}

      {isKaraokeMinimized && karaokeStatus === 'processing' && (
        <div
          className="karaoke-top-progress-bar"
          onClick={() => setIsKaraokeMinimized(false)}
          aria-label="Show Karaoke Processing"
          title="Return to Karaoke"
        >
          <div className="karaoke-top-progress-fill" style={{ width: `${karaokeProgress}%` }} />
        </div>
      )}
    </>
  );
}