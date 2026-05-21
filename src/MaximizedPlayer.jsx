import { useContext, useState, useEffect, useRef } from "react";
import { AudioContext } from "./AudioPlayerProvider";
import MaximizedRadialVolume from "./components/MaximizedRadialVolume";
import PlayPauseAnimButton from "./components/PlayPauseAnimButton";
import { useCinematicControls } from "./hooks/useCinematicControls";
import "./MaximizedPlayer.css";

// Must match the CSS animation duration (3.2s)
const TRANSITION_DURATION = 3000;

export default function MaximizedPlayer({ onClose }) {
  const {
    audioRef,
    songs,
    albumData,
    isPlaying,
    setIsPlaying,
    currentTime,
    activeSong,
    shuffleMode,
    toggleShuffle,
    repeatMode,
    cycleRepeat,
    playNext,
    playPrev,
    isCinematicActive,
    setIsCinematicActive,
  } = useContext(AudioContext);

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [direction, setDirection] = useState("next");
  const [prevSongData, setPrevSongData] = useState(null);
  const [isClosing, setIsClosing] = useState(false);

  // We keep a local copy of the metadata so we can delay its update
  // until the background crossfade midpoint (1.5s).
  const [displayMetadata, setDisplayMetadata] = useState({
    name: activeSong?.name,
    title: albumData?.title,
    member: albumData?.member
  });

  // Keep in sync when NOT transitioning
  useEffect(() => {
    if (!isTransitioning) {
      setDisplayMetadata({
        name: activeSong?.name,
        title: albumData?.title,
        member: albumData?.member
      });
    }
  }, [activeSong, albumData, isTransitioning]);

  // ── Spin angle tracking ──────────────────────────────────────
  // rAF loop keeps spinAngleRef current while playing.
  // On transition start we stamp the live angle onto the exiting
  // platter as --spin-angle so platterRetract starts from the
  // real current rotation instead of jumping to 0deg.
  const spinAngleRef = useRef(0);
  const spinRAFRef = useRef(null);
  const lastTSRef = useRef(null);
  const RPM = 33.33;
  const DEG_PER_MS = (RPM * 360) / 60000; // ~0.2 deg/ms

  useEffect(() => {
    if (isPlaying) {
      const tick = (ts) => {
        if (lastTSRef.current !== null) {
          spinAngleRef.current =
            (spinAngleRef.current + (ts - lastTSRef.current) * DEG_PER_MS) % 360;
        }
        lastTSRef.current = ts;
        spinRAFRef.current = requestAnimationFrame(tick);
      };
      spinRAFRef.current = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(spinRAFRef.current);
      lastTSRef.current = null;
    }
    return () => cancelAnimationFrame(spinRAFRef.current);
  }, [isPlaying]);

  // ── Cinematic Coordination Lifecycle ─────────────────────────
  useEffect(() => {
    setIsCinematicActive(true);
    return () => setIsCinematicActive(false);
  }, [setIsCinematicActive]);

  // ── Automated Transitions (Autoplay & Shortcuts) ─────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // 1. Natural Autoplay
    const handleAutoplayEnd = () => {
      // If we are in repeat one, the provider handles it (it resets time)
      // but if we are in normal progression, we trigger transition.
      // AudioPlayerProvider handleEnded returns early if isCinematicActive is true.
      triggerTransition("next", playNext);
    };

    // 2. Keyboard Shortcuts (Cmd + Arrows)
    const handleShortcuts = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (!(e.metaKey || e.ctrlKey)) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopImmediatePropagation();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopImmediatePropagation();
        handlePrev();
      }
    };

    audio.addEventListener('ended', handleAutoplayEnd);
    window.addEventListener('keydown', handleShortcuts, true); // useCapture to beat persistent player
    return () => {
      audio.removeEventListener('ended', handleAutoplayEnd);
      window.removeEventListener('keydown', handleShortcuts, true);
    };
  }, [audioRef, playNext, playPrev, isTransitioning]); // triggerTransition is stable enough

  // ── Sync Playback with Transition ───────────────────────────
  // During the 3.2s cinematic transition, we enforce a pause
  // so the user can enjoy the physical "reveal" before the music starts.
  useEffect(() => {
    if (isTransitioning && isPlaying) {
      setIsPlaying(false);
      if (audioRef.current) audioRef.current.pause();
    }
  }, [isTransitioning, isPlaying, activeSong, setIsPlaying, audioRef]);

  // Ref to the currently active platter DOM node
  const activePlatterRef = useRef(null);

  if (!albumData || !songs.length) return null;

  // ── Handlers ────────────────────────────────────────────────

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => onClose(), 380);
  };

  const triggerTransition = (dir, playFn) => {
    if (isTransitioning) return;

    // Stamp live spin angle onto the exiting platter so the
    // CSS keyframe deceleration starts from the real angle
    if (activePlatterRef.current) {
      activePlatterRef.current.style.setProperty(
        "--spin-angle",
        `${spinAngleRef.current.toFixed(2)}deg`
      );
    }

    setPrevSongData({
      name: activeSong?.name,
      cover: albumData?.cover,
      member: albumData?.member,
    });
    setDirection(dir);
    setIsTransitioning(true);
    playFn();
    setIsPlaying(false);
    if (audioRef.current) audioRef.current.pause();

    setTimeout(() => {
      // At the midpoint of the 3s transition (when BG has started to swap),
      // we flip the title and artist info.
      setDisplayMetadata({
        name: songs[currentIndex]?.name || activeSong?.name, // fallback as context might have updated
        title: albumData?.title,
        member: albumData?.member
      });
    }, 1500);

    setTimeout(() => {
      setIsTransitioning(false);
      setPrevSongData(null);
      setIsPlaying(true);
      if (audioRef.current) audioRef.current.play();
    }, TRANSITION_DURATION);
  };

  const handlePrev = (e) => { e?.stopPropagation(); triggerTransition("prev", playPrev); };
  const handleNext = (e) => { e?.stopPropagation(); triggerTransition("next", playNext); };

  // Restore z-index after the reveal animation finishes
  const handlePlatterAnimationEnd = (e) => {
    if (e.animationName === "platterReveal") {
      e.currentTarget.style.zIndex = "2";
    }
  };

  // ── Render helpers ───────────────────────────────────────────

  const renderVinylUnit = (song, album, animClass, spin, isActive) => (
    <div className={`vinyl-unit ${animClass}`}>
      <div className="vinyl-sleeve">
        <img src={album?.cover} alt="Album sleeve" />
      </div>

      <div
        className="vinyl-platter"
        ref={isActive ? activePlatterRef : null}
        onAnimationEnd={handlePlatterAnimationEnd}
      >
        <div
          className={`vinyl-record ${spin ? "spinning" : ""}`}
          style={{ "--cover-url": `url(${album?.cover})` }}
        >
          <div className="vinyl-label">
            <div className="vinyl-hole" />
            <span className="label-song">{song?.name}</span>
            <span className="label-artist">{album?.member}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const formatTime = (t) => {
    if (!t || isNaN(t)) return "0:00";
    return `${Math.floor(t / 60)}:${Math.floor(t % 60).toString().padStart(2, "0")}`;
  };

  const handleSeek = (e) => {
    if (!audioRef.current?.duration) return;
    audioRef.current.currentTime =
      (Number(e.target.value) / 100) * audioRef.current.duration;
  };

  const duration = audioRef.current?.duration || 0;
  const progress = duration ? (currentTime / duration) * 100 : 0;

  const { isControlsVisible } = useCinematicControls({ isActive: true });

  // ── Render ───────────────────────────────────────────────────

  const accentColor = albumData?.color || "#F3CEB0"; // Fallback to warm cream

  return (
    <div
      className={`maximized-overlay
        ${isClosing ? "closing" : ""}
        ${!isControlsVisible ? "cinematic-mode" : ""}`}
      style={{
        "--accent-color": accentColor,
      }}
    >
      {/* Base blurred album background */}
      <div className="maximized-bg" style={{ backgroundImage: `url(${albumData.cover})` }} />
      {isTransitioning && prevSongData && (
        <div
          className="maximized-bg prev-bg-fade"
          style={{ backgroundImage: `url(${prevSongData.cover})` }}
        />
      )}
      
      {/* 60-70% dim overlay + Vignette + Noise layer for premium cinematic feel */}
      <div className="maximized-bg-tint" />
      <div className="maximized-bg-vignette" />
      <div className="maximized-bg-noise" />
      
      {/* Spotlighting behind album */}
      <div className="maximized-bg-spotlight" />

      <button className="max-close-btn cinematic-hide" onClick={handleClose}>✕</button>

      <div className="max-volume-wrapper cinematic-hide">
        <MaximizedRadialVolume />
      </div>

      {/* ── DESKTOP: Vinyl Stage ── */}
      <div className="vinyl-stage">

        {/* ── Active (incoming) unit — always present ── */}
        {renderVinylUnit(
          activeSong,
          albumData,
          isTransitioning ? `entry-${direction}` : "",
          isPlaying,
          true   // isActive → gets the ref
        )}

        {/* ── Exiting unit — present only during transition ── */}
        {isTransitioning && prevSongData && renderVinylUnit(
          prevSongData,
          prevSongData,
          `exit-${direction}`,
          false,  // CSS platterRetract owns decel; no .spinning class
          false
        )}

        {/* ── Tonearm — fixed over platter position ── */}
        <div className="tonearm-anchor">
          <div className={`tonearm-wrap ${isPlaying ? "dropped" : ""}`}>
            <div className="tonearm-base" />
            <div className="tonearm-arm" />
            <div className="tonearm-head" />
          </div>
        </div>

      </div>

      {/* ── MOBILE: Circular Album Art with Progress Ring ── */}
      <div className="mobile-player-layout">
        {/* Mobile header */}
        <div className="mobile-player-header">
          <button className="mobile-close-btn" onClick={handleClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
            </svg>
          </button>
          <span className="mobile-playlist-name">{displayMetadata.title || "Now Playing"}</span>
          {/* Spacer to keep title centred */}
          <div style={{ width: 44 }} />
        </div>

        {/* Song info (above circle) */}
        <div className="mobile-song-info">
          <h2>{displayMetadata.name}</h2>
          <p>{displayMetadata.member}</p>
        </div>

        {/* Circular album art */}
        <div className="mobile-art-container">
          <div className="mobile-album-circle">
            <div className="light-reflection" />
            <img src={albumData.cover} alt={albumData.title} />
          </div>
        </div>

        {/* Straight progress bar */}
        <div className="mobile-progress-section">
          <input
            type="range"
            className="mobile-straight-progress"
            min="0"
            max="100"
            value={progress}
            onChange={handleSeek}
            style={{ "--progress": `${progress}%` }}
          />
          <div className="mobile-time-row">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Main playback controls */}
        <div className="mobile-controls-main">
          <button className="mobile-ctrl-btn mobile-ctrl-accent-filled" onClick={handlePrev} disabled={isTransitioning} aria-label="Previous">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
            </svg>
          </button>

          <button
            className="mobile-play-btn"
            onClick={() => setIsPlaying(!isPlaying)}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button className="mobile-ctrl-btn mobile-ctrl-accent-filled" onClick={handleNext} disabled={isTransitioning} aria-label="Next">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>
        </div>

        {/* Secondary controls */}
        <div className="mobile-controls-secondary">
          <button
            className={`mobile-secondary-btn ${shuffleMode ? "mobile-sec-active" : ""}`}
            onClick={toggleShuffle}
            aria-label="Shuffle"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
            </svg>
          </button>
          <button
            className={`mobile-secondary-btn ${repeatMode !== "off" ? "mobile-sec-active" : ""}`}
            onClick={cycleRepeat}
            aria-label="Repeat"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
            </svg>
            {repeatMode === "one" && <span className="mobile-repeat-badge">1</span>}
          </button>
        </div>
      </div>

      {/* ── DESKTOP: Song Info ── */}
      <div className="maximized-song-info cinematic-hide">
        <h2>{displayMetadata.name}</h2>
        <p>{displayMetadata.title} · {displayMetadata.member}</p>
      </div>

      {/* ── DESKTOP: Controls ── */}
      <div className="maximized-controls-container cinematic-hide">
        <div className="max-time-bar">
          <span>{formatTime(currentTime)}</span>
          <input
            type="range" min="0" max="100"
            value={progress}
            onChange={handleSeek}
          />
          <span>{formatTime(duration)}</span>
        </div>

        <div className="max-playback-pill">

          <button
            className={`max-mode-btn ${shuffleMode ? "max-mode-active" : ""}`}
            onClick={toggleShuffle}
            title={shuffleMode ? "Shuffle on" : "Shuffle off"}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
            </svg>
          </button>

          <button onClick={handlePrev} disabled={isTransitioning}>⏮</button>

          <PlayPauseAnimButton
            isPlaying={isPlaying}
            onClick={() => setIsPlaying(!isPlaying)}
            className="max-play-btn"
          />

          <button onClick={handleNext} disabled={isTransitioning}>⏭</button>

          <button
            className={`max-mode-btn ${repeatMode !== "off" ? "max-mode-active" : ""}`}
            onClick={cycleRepeat}
            title={
              repeatMode === "off" ? "Repeat off"
                : repeatMode === "all" ? "Repeat all"
                  : "Repeat one"
            }
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
            </svg>
            {repeatMode === "one" && <span className="max-repeat-badge">1</span>}
          </button>

        </div>
      </div>
    </div>
  );
}