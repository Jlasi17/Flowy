import { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { AudioContext } from '../AudioPlayerProvider';
import { useLyrics } from '../hooks/useLyrics';
import { getSingerColor, getArtistProfileImage, SINGER_COLORS } from '../utils/singerColors';
import PlayPauseAnimButton from './PlayPauseAnimButton';
import DualEqualizer, { VocalQuickToggle } from './DualEqualizer';
import { useCinematicControls } from '../hooks/useCinematicControls';
import SandParticles from './SandParticles';
import './KaraokePanel.css';

export default function KaraokePanel({ onClose }) {
  const {
    audioRef,
    albumData,
    activeSong,
    isPlaying,
    setIsPlaying,
    currentTime,
    playNext,
    playPrev,
    songs,
    currentIndex,
    karaokeStatus,
    karaokeProgress,
    cancelKaraoke,
    nextKaraokeCountdown,
    preloadingNext,
    preloadProgress,
    setIsKaraokeMinimized,
  } = useContext(AudioContext);

  const handleMinimize = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsKaraokeMinimized(true);
      if (onClose) onClose();
    }, 400); // Wait for closing animation
  };

  const [isClosing, setIsClosing] = useState(false);
  const [showPreloadToast, setShowPreloadToast] = useState(false);

  useEffect(() => {
    if (preloadingNext) {
      setShowPreloadToast(true);
      const timer = setTimeout(() => {
        setShowPreloadToast(false);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setShowPreloadToast(false);
    }
  }, [preloadingNext]);

  const { lines, activeIndex, loading, hasLyrics } = useLyrics();
  const scrollRef = useRef(null);
  const activeLineRef = useRef(null);
  const [userInteracting, setUserInteracting] = useState(false);
  const interactionTimerRef = useRef(null);

  // ── User interaction for lyrics scroll ──
  const handleUserInteraction = useCallback(() => {
    setUserInteracting(true);
    if (interactionTimerRef.current) clearTimeout(interactionTimerRef.current);
    interactionTimerRef.current = setTimeout(() => {
      setUserInteracting(false);
    }, 3000);
  }, []);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const events = ['wheel', 'touchmove', 'mousedown'];
    events.forEach(ev => scrollEl.addEventListener(ev, handleUserInteraction));

    return () => {
      events.forEach(ev => scrollEl.removeEventListener(ev, handleUserInteraction));
      if (interactionTimerRef.current) clearTimeout(interactionTimerRef.current);
    };
  }, [handleUserInteraction]);

  // Auto-scroll lyrics
  useEffect(() => {
    if (activeLineRef.current && scrollRef.current && !userInteracting) {
      const container = scrollRef.current;
      const activeLine = activeLineRef.current;

      const containerCenter = container.clientHeight / 2;
      const lineCenter = activeLine.clientHeight / 2;
      const scrollPosition = activeLine.offsetTop - containerCenter + lineCenter;

      container.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
      });
    }
  }, [activeIndex, userInteracting]);

  // Reset scroll on song change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setUserInteracting(false);
  }, [activeSong?.name]);

  const handleClose = () => {
    setIsClosing(true);
    cancelKaraoke();
    setTimeout(() => onClose(), 400);
  };

  const seekToLine = (time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleSeek = (e) => {
    if (!audioRef.current?.duration) return;
    const newTime = (Number(e.target.value) / 100) * audioRef.current.duration;
    audioRef.current.currentTime = newTime;
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const duration = audioRef.current?.duration || 0;
  const progress = duration ? (currentTime / duration) * 100 : 0;

  // Get singer colors for active line
  const activeSinger = lines[activeIndex]?.singer;
  const activeSingerColor = getSingerColor(activeSinger);

  // Derive unique singers for gradient resolution
  const songSingers = (() => {
    const allSet = new Set();
    lines.forEach(l => {
      if (!l.singer || l.singer === 'Instrumental' || l.singer === 'End') return;
      const tokens = l.singer.split(/,(?![^()]*\))/).map(s => s.trim());
      tokens.forEach(t => {
        const names = t.replace(/[()]/g, '').split(/\||,|&/).map(s => s.trim()).filter(Boolean);
        names.forEach(n => {
          if (n.toLowerCase() !== 'all') allSet.add(n);
        });
      });
    });
    return Array.from(allSet).filter(name => getSingerColor(name) !== SINGER_COLORS.default);
  })();

  // ── Progress ring math ──
  const ringRadius = 96;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (karaokeProgress / 100) * ringCircumference;

  // ── Cinematic auto-hide ──
  const { isControlsVisible } = useCinematicControls({ isActive: karaokeStatus === 'ready' });

  const touchStartRef = useRef(null);

  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    if (e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'button' || e.target.closest('button')) return;

    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now()
    };
  };

  const handleTouchEnd = (e) => {
    if (!touchStartRef.current) return;
    const startX = touchStartRef.current.x;
    const startY = touchStartRef.current.y;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;

    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const timeDiff = Date.now() - touchStartRef.current.time;

    touchStartRef.current = null;

    if (timeDiff > 600) return;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (Math.abs(deltaX) > 40) {
        if (deltaX < 0) playNext();
        else if (deltaX > 0) playPrev();
      }
    } else {
      // Vertical swipe down
      if (deltaY > 50) {
        const scrollArea = e.target.closest('.karaoke-lyrics-container');
        if (!scrollArea || scrollArea.scrollTop <= 5) {
          handleClose();
        }
      }
    }
  };

  return (
    <div
      className={`karaoke-overlay ${isClosing ? 'closing' : ''} ${karaokeStatus === 'ready' && !isControlsVisible ? 'cinematic-mode' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background */}
      <div
        className="karaoke-bg"
        style={{
          backgroundImage: (activeSong?.cover || albumData?.cover) ? `url(${activeSong?.cover || albumData?.cover})` : 'none',
          backgroundColor: !(activeSong?.cover || albumData?.cover) ? albumData?.color : undefined
        }}
      />
      <div className="karaoke-bg-tint" />

      {/* ═══ PROCESSING STATE ═══ */}
      {karaokeStatus === 'processing' && (
        <div className="karaoke-processing">
          {/* Gravity-based sand particle accumulation */}
          <SandParticles progress={karaokeProgress} />

          <div className="karaoke-progress-ring-container">
            <div className="karaoke-waves">
              <div className="karaoke-wave-line"></div>
              <div className="karaoke-wave-line"></div>
              <div className="karaoke-wave-line"></div>
              <div className="karaoke-wave-line"></div>
              <div className="karaoke-wave-line"></div>
              <div className="karaoke-wave-line"></div>
              <div className="karaoke-wave-line"></div>
              <div className="karaoke-wave-line"></div>
            </div>
            <svg className="karaoke-progress-ring" viewBox="0 0 220 220">
              <defs>
                <linearGradient id="karaokeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff4d4d" />
                  <stop offset="50%" stopColor="#ff1f1f" />
                  <stop offset="100%" stopColor="#cc0000" />
                </linearGradient>
              </defs>
              <circle
                className="karaoke-progress-ring-bg"
                cx="110" cy="110" r={ringRadius}
              />
              <circle
                className="karaoke-progress-ring-fill"
                cx="110" cy="110" r={ringRadius}
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
              />
            </svg>
            <div className="karaoke-progress-percent">
              <span className="karaoke-progress-number">{karaokeProgress}</span>
              <span className="karaoke-progress-label">percent</span>
            </div>
          </div>

          <div className="karaoke-processing-info">
            <svg className="karaoke-mic-pulse" viewBox="0 0 206.886 206.886" fill="currentColor">
              <path d="M52.396,206.886c-8.4,0-16.298-3.271-22.237-9.211c-5.94-5.94-9.211-13.837-9.211-22.237c0-8.4,3.271-16.297,9.211-22.237 l7.604-7.604l-2.872-2.872c-5.27-5.27-5.443-13.692-0.394-19.173l49.225-53.438c-1.568-2.716-1.303-6.235,0.854-8.692l24.493-27.883 c1.11-8.494,4.894-16.174,10.967-22.248c15.052-15.052,39.544-15.052,54.596,0c7.292,7.292,11.308,16.986,11.308,27.298 c0,10.312-4.016,20.006-11.308,27.298c-6.073,6.074-13.754,9.857-22.248,10.968l-27.883,24.492 c-2.457,2.158-5.976,2.423-8.691,0.854L62.37,151.424c-5.481,5.049-13.903,4.876-19.173-0.394l-2.606-2.606l-7.604,7.604 c-10.702,10.702-10.702,28.116,0,38.818c5.185,5.184,12.077,8.04,19.409,8.04c7.332,0,14.225-2.855,19.409-8.04l55.149-55.149 c9.824-9.824,25.81-9.824,35.634,0c9.825,9.824,9.825,25.81,0,35.634l-15.229,15.229c-0.78,0.781-2.047,0.781-2.828,0 c-0.781-0.781-0.781-2.047,0-2.828l15.229-15.229c4.003-4.004,6.208-9.327,6.208-14.989c0-5.662-2.205-10.985-6.208-14.988 c-8.264-8.264-21.712-8.265-29.978,0l-55.149,55.149C68.693,203.615,60.796,206.886,52.396,206.886z M42.023,144.2l4.002,4.002 c3.747,3.746,9.737,3.871,13.635,0.279l54.664-50.353c0.79-0.726,2.011-0.702,2.769,0.057c1.297,1.296,3.39,1.364,4.768,0.154 l26.997-23.714l-37.563-37.563L87.581,64.06c-1.209,1.377-1.142,3.472,0.154,4.767c0.759,0.759,0.784,1.98,0.057,2.77L37.439,126.26 c-3.591,3.898-3.468,9.887,0.28,13.635l4.268,4.268c0.006,0.006,0.012,0.012,0.018,0.018 C42.012,144.188,42.017,144.194,42.023,144.2z M113.148,33.258l39.515,39.515c7.295-1.122,13.889-4.464,19.141-9.716 c13.493-13.493,13.493-35.447,0-48.94c-13.494-13.493-35.448-13.492-48.94,0C117.612,19.37,114.27,25.964,113.148,33.258z M92.884,101.044c-2.036,0-3.951-0.793-5.391-2.233l-0.383-0.383c-2.972-2.972-2.972-7.808,0-10.78l19.687-19.687 c2.972-2.972,7.809-2.973,10.78,0l0.383,0.382c2.973,2.973,2.973,7.809,0.001,10.781L98.274,98.81h0 C96.835,100.25,94.92,101.044,92.884,101.044z M112.187,69.729c-0.928,0-1.855,0.353-2.562,1.06L89.939,90.475 c-1.413,1.413-1.413,3.711,0,5.124l0.383,0.383c1.369,1.369,3.755,1.369,5.124,0h0l19.687-19.687 c0.684-0.685,1.061-1.594,1.061-2.562s-0.377-1.877-1.061-2.562l-0.383-0.382C114.043,70.083,113.115,69.729,112.187,69.729z M93.103,94.818c-0.512,0-1.024-0.195-1.414-0.586c-0.781-0.781-0.781-2.047,0-2.828l3.181-3.181c0.78-0.781,2.048-0.781,2.828,0 c0.781,0.781,0.781,2.047,0,2.828l-3.181,3.181C94.127,94.622,93.615,94.818,93.103,94.818z M164.868,22.684 c-0.512,0-1.024-0.195-1.414-0.586c-8.99-8.989-23.618-8.991-32.609,0c-0.78,0.781-2.048,0.781-2.828,0 c-0.781-0.781-0.781-2.047,0-2.828c10.551-10.55,27.717-10.549,38.266,0c0.781,0.781,0.781,2.047,0,2.828 C165.892,22.489,165.38,22.684,164.868,22.684z" />
            </svg>
            <span className="karaoke-processing-title">Preparing your karaoke…</span>
            <span className="karaoke-processing-song">
              {activeSong?.name} · {albumData?.title}
            </span>
            <div className="karaoke-processing-actions">
              <button className="karaoke-processing-cancel" onClick={handleClose}>
                Cancel
              </button>
              <button className="karaoke-processing-bg-btn" onClick={handleMinimize}>
                Run in Background
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SINGING STATE ═══ */}
      {karaokeStatus === 'ready' && (
        <>
          <div className="karaoke-header">
            <div className="karaoke-header-left">
              <button className="karaoke-cancel-btn" onClick={handleClose} aria-label="Exit Karaoke">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
              <img
                src={activeSong?.cover || albumData?.cover}
                alt={albumData?.title}
                className="karaoke-header-art"
              />
              <div className="karaoke-header-meta">
                <span className="karaoke-header-title">{activeSong?.name}</span>
                <span className="karaoke-header-sub">
                  {albumData?.title} · {albumData?.member || 'BTS'}
                </span>
              </div>
            </div>
            <div className="karaoke-mode-badge">
              KARAOKE
            </div>
            <div className="karaoke-top-right-controls">
              <VocalQuickToggle />
            </div>
          </div>

          {loading ? (
            <div className="lyrics-empty" style={{ position: 'relative', zIndex: 10, flex: 1 }}>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '1.1rem' }}>Loading lyrics…</p>
            </div>
          ) : hasLyrics ? (
            <div className="karaoke-lyrics-area" ref={scrollRef}>
              <div style={{ height: '30vh' }} />
              {lines.map((line, i) => {
                const isActive = i === activeIndex;
                const isPast = i < activeIndex;

                const tokens = line.singer ? line.singer.split(/,(?![^()]*\))/).map(s => s.trim()) : [];
                const bgTokens = tokens.filter(t => t.startsWith('(')).map(t => t.slice(1, -1));
                const mainTokens = tokens.filter(t => !t.startsWith('('));

                const getStyleForNames = (names, isMain) => {
                  let resolvedNames = [...names];
                  if (resolvedNames.some(n => n.toLowerCase() === 'all')) {
                    const otherNames = resolvedNames.filter(n => n.toLowerCase() !== 'all');
                    resolvedNames = [...new Set([...otherNames, ...songSingers])];
                  }
                  if (!isActive || resolvedNames.length === 0) {
                    return { color: '#ffffff', textShadow: 'none' };
                  }
                  if (resolvedNames.length === 1) {
                    const colorDef = getSingerColor(resolvedNames[0]);
                    return isMain ? {
                      color: colorDef.primary,
                      textShadow: `0 0 40px ${colorDef.glow}, 0 0 80px ${colorDef.glow}`
                    } : {
                      color: colorDef.primary,
                      textShadow: `0 0 20px ${colorDef.glow}`,
                      opacity: 0.9
                    };
                  } else {
                    const colors = resolvedNames.map(s => getSingerColor(s));
                    const gradientString = colors.map(c => c.primary).join(', ');
                    return isMain ? {
                      backgroundImage: `linear-gradient(90deg, ${gradientString})`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      color: 'transparent',
                      filter: `drop-shadow(0 0 15px ${colors[0].glow}) drop-shadow(0 0 30px ${colors[colors.length - 1].glow})`
                    } : {
                      backgroundImage: `linear-gradient(90deg, ${gradientString})`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      color: 'transparent',
                      filter: `drop-shadow(0 0 10px ${colors[0].glow})`,
                      opacity: 0.9
                    };
                  }
                };

                const bgStyles = bgTokens.map(t =>
                  getStyleForNames(t.split(/\||,|&/).map(s => s.trim()).filter(Boolean), false)
                );
                const mainNames = mainTokens.flatMap(t => t.split(/\||,|&/)).map(s => s.trim()).filter(Boolean);
                const mainStyle = getStyleForNames(mainNames, true);

                const renderLyricText = (line, bgStyles, mainStyle) => {
                  if (line.singer === 'Instrumental') return '♪ ♪ ♪';
                  if (line.singer === 'End') return '';
                  const text = line.text;
                  if (!text.includes('(')) return <span style={mainStyle}>{text}</span>;
                  const parts = text.split(/(\([^)]+\))/g);
                  let bgIdx = 0;
                  return parts.map((part, index) => {
                    if (part.startsWith('(') && part.endsWith(')')) {
                      const style = bgStyles[bgIdx++] || bgStyles[bgStyles.length - 1] || mainStyle;
                      return <span key={index} style={style}>{part}</span>;
                    }
                    return <span key={index} style={mainStyle}>{part}</span>;
                  });
                };

                return (
                  <div
                    key={i}
                    ref={isActive ? activeLineRef : null}
                    className={`lyric-line ${isActive ? 'active' : ''} ${isPast ? 'past' : ''}`}
                    onClick={() => seekToLine(line.time)}
                  >
                    <div className="lyric-line-text">
                      {renderLyricText(line, bgStyles, mainStyle)}
                    </div>
                  </div>
                );
              })}
              <div style={{ height: '35vh' }} />
            </div>
          ) : (
            <div className="lyrics-empty" style={{ position: 'relative', zIndex: 10, flex: 1 }}>
              <div className="lyrics-empty-icon">🎤</div>
              <p className="lyrics-empty-text">Sing along!</p>
              <p className="lyrics-empty-sub">No lyrics available for this track</p>
            </div>
          )}

          <div className="karaoke-player-bar">
            <div className="karaoke-seek-row">
              <span>{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={handleSeek}
                aria-label="Seek"
                style={{
                  background: `linear-gradient(to right, ${activeSingerColor.primary} ${progress}%, rgba(255,255,255,0.2) ${progress}%)`,
                }}
              />
              <span>{formatTime(duration)}</span>
            </div>
            <div className="karaoke-controls-row">
              <button className="karaoke-ctrl-btn" onClick={playPrev} aria-label="Previous">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
                </svg>
              </button>
              <PlayPauseAnimButton
                isPlaying={isPlaying}
                onClick={() => setIsPlaying(!isPlaying)}
                className="karaoke-ctrl-btn karaoke-play-btn"
              />
              <button className="karaoke-ctrl-btn" onClick={playNext} aria-label="Next">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </svg>
              </button>
            </div>
          </div>

          {preloadingNext && showPreloadToast && (
            <div className="karaoke-preload-indicator">
              <div className="karaoke-preload-spinner" />
              <span className="preload-percent">{preloadProgress}%</span>
              <span className="preload-text">Next song is getting processed...</span>
            </div>
          )}

          {preloadingNext && !showPreloadToast && (
            <div className="karaoke-top-progress-bar">
              <div className="karaoke-top-progress-fill" style={{ width: `${preloadProgress}%` }} />
            </div>
          )}

          {/* ── Edge Timebar — pinned to absolute bottom, appears in cinematic mode ── */}
          <div className="edge-timebar">
            <input
              type="range"
              className="edge-timebar-range"
              min="0"
              max="100"
              value={progress}
              onChange={handleSeek}
              aria-label="Seek"
              style={{
                '--progress': `${progress}%`,
                '--accent': activeSingerColor.primary,
              }}
            />
          </div>
        </>
      )}

      {/* ═══ COUNTDOWN STATE ═══ */}
      {karaokeStatus === 'countdown' && (
        <div className="karaoke-countdown">
          <span className="karaoke-countdown-text">Get ready to sing!</span>
          <span className="karaoke-countdown-number" key={nextKaraokeCountdown}>
            {nextKaraokeCountdown}
          </span>
          {activeSong && (
            <div className="karaoke-countdown-next-info">
              <span className="karaoke-countdown-next-label">Starting...</span>
              <div className="karaoke-countdown-next-song">
                <img
                  src={activeSong?.cover || albumData?.cover}
                  alt="Next"
                  className="karaoke-countdown-art"
                />
                <div className="karaoke-countdown-song-meta">
                  <span className="karaoke-countdown-song-title">{activeSong.name}</span>
                  <span className="karaoke-countdown-song-artist">
                    {albumData?.title} · {albumData?.member || 'BTS'}
                  </span>
                </div>
              </div>
            </div>
          )}
          <button className="karaoke-processing-cancel" onClick={handleClose} style={{ marginTop: '40px' }}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}