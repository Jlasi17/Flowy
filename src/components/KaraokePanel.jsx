import { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { AudioContext } from '../AudioPlayerProvider';
import { useLyrics } from '../hooks/useLyrics';
import { getSingerColor, getArtistProfileImage, SINGER_COLORS } from '../utils/singerColors';
import PlayPauseAnimButton from './PlayPauseAnimButton';
import DualEqualizer, { VocalQuickToggle } from './DualEqualizer';
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
  } = useContext(AudioContext);

  const [isClosing, setIsClosing] = useState(false);
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
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
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

  return (
    <div className={`karaoke-overlay ${isClosing ? 'closing' : ''}`}>
      {/* Background */}
      <div
        className="karaoke-bg"
        style={{ backgroundImage: `url(${albumData?.cover})` }}
      />
      <div className="karaoke-bg-tint" />

      {/* ═══ PROCESSING STATE ═══ */}
      {karaokeStatus === 'processing' && (
        <div className="karaoke-processing">
          <div className="karaoke-particles">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="karaoke-particle" />
            ))}
          </div>

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
            <svg className="karaoke-mic-pulse" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
            <span className="karaoke-processing-title">Preparing your karaoke…</span>
            <span className="karaoke-processing-song">
              {activeSong?.name} · {albumData?.title}
            </span>
            <button className="karaoke-processing-cancel" onClick={handleClose}>
              Cancel
            </button>
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
                src={albumData?.cover}
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

          {preloadingNext && (
            <div className="karaoke-preload-indicator">
              <div className="karaoke-preload-spinner" />
              Preloading next song… {preloadProgress}%
            </div>
          )}
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
                  src={albumData?.cover}
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
