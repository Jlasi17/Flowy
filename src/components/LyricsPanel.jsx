import { useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AudioContext } from '../AudioPlayerProvider';
import { useLyrics } from '../hooks/useLyrics';
import { getSingerColor, getArtistProfileImage, SINGER_COLORS } from '../utils/singerColors';
import PlayPauseAnimButton from './PlayPauseAnimButton';
import KaraokeButton from './KaraokeButton';
import { useCinematicControls } from '../hooks/useCinematicControls';
import './LyricsPanel.css';

export default function LyricsPanel({ onClose }) {
  const {
    audioRef,
    albumData,
    activeSong,
    isPlaying,
    setIsPlaying,
    currentTime,
    playNext,
    playPrev,
    startKaraoke,
    cancelKaraoke,
    karaokeMode,
    shuffleMode,
    toggleShuffle,
    repeatMode,
    cycleRepeat,
  } = useContext(AudioContext);

  const [isClosing, setIsClosing] = useState(false);
  const { lines, activeIndex, loading, hasLyrics } = useLyrics();
  const scrollRef = useRef(null);
  const activeLineRef = useRef(null);
  const [userInteracting, setUserInteracting] = useState(false);
  const interactionTimerRef = useRef(null);

  const handleUserInteraction = useCallback(() => {
    setUserInteracting(true);
    if (interactionTimerRef.current) clearTimeout(interactionTimerRef.current);
    interactionTimerRef.current = setTimeout(() => {
      setUserInteracting(false);
    }, 3000); // Resume auto-scroll after 3 seconds of inactivity
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

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => onClose(), 380);
  };

  const handleSeek = (e) => {
    if (!audioRef.current?.duration) return;
    audioRef.current.currentTime = (Number(e.target.value) / 100) * audioRef.current.duration;
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const duration = audioRef.current?.duration || 0;
  const progress = duration ? (currentTime / duration) * 100 : 0;

  // Reset scroll to top when song changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setUserInteracting(false);
  }, [activeSong?.name]);

  // Auto-scroll to keep active line centered
  useEffect(() => {
    if (activeLineRef.current && scrollRef.current && !userInteracting) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex, userInteracting]);

  // Seek to lyric line on click
  const seekToLine = (time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  // Derive accent color from active line's singer
  const activeSinger = lines[activeIndex]?.singer;
  const activeSingerColor = getSingerColor(activeSinger);

  const { isControlsVisible } = useCinematicControls({ isActive: true });

  const ORBS = useMemo(() => {
    const rawSingers = lines.map(l => l.singer).filter(s => s && s !== 'Instrumental' && s !== 'End');
    // Flatten multi-singer tags AND remove parentheses from background singers
    const flattenedSingers = rawSingers.flatMap(s =>
      s.replace(/[()]/g, '').split(/\||,|&/).map(n => n.trim())
    );

    // Only create bubbles for unique singers that actually have a profile image
    const uniqueSingers = [...new Set(flattenedSingers)]
      .filter(singer => getArtistProfileImage(singer) !== null);

    const POSITIONS = [
      { top: '25%', left: '10%' },//jk
      { top: '35%', right: '3%' },//jimin
      { bottom: '15%', left: '15%' },//rm
      { bottom: '13%', right: '4%' },//v
      { top: '50%', left: '20%' },//suga
      { top: '55%', right: '17%' }, //jin
      { top: '17%', right: '19%' }//jhope

    ];

    if (uniqueSingers.length === 1) {
      return [{
        name: uniqueSingers[0],
        pos: { top: '20%', right: '15%' },
        animDelay: '0s'
      }];
    }

    return uniqueSingers.map((singer, idx) => ({
      name: singer,
      pos: POSITIONS[idx % POSITIONS.length],
      animDelay: `-${idx * 2}s`
    }));
  }, [lines]);

  // Derive the set of all unique singers mentioned in this song (excluding 'All')
  const songSingers = useMemo(() => {
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
    // Filter to only known singers to keep gradient clean
    return Array.from(allSet).filter(name => getSingerColor(name) !== SINGER_COLORS.default);
  }, [lines]);

  const isSingleSinger = songSingers.length === 1;
  const singleSingerColor = isSingleSinger ? getSingerColor(songSingers[0]) : null;

  // Check if singer is actively singing (not a pause/instrumental/end)
  const isCurrentlySinging = isSingleSinger &&
    activeSinger &&
    activeSinger !== 'Instrumental' &&
    activeSinger !== 'End' &&
    activeSinger !== 'NA';

  return (
    <div
      className={`lyrics-overlay ${isClosing ? 'closing' : ''} ${!isControlsVisible ? 'cinematic-mode' : ''} ${isSingleSinger ? 'single-singer-mode' : ''}`}
      style={isSingleSinger ? {
        '--singer-color': singleSingerColor.primary,
        '--singer-glow': singleSingerColor.glow,
      } : {}}
    >
      {/* Blurred album art background */}
      <div
        className="lyrics-bg"
        style={{ backgroundImage: `url(${albumData?.cover})` }}
      />
      <div
        className="lyrics-bg-tint"
        style={{
          '--album-color': albumData?.color || 'rgba(20,20,40,1)',
        }}
      />

      {/* ── Single Singer Diffused Frame ── */}
      {isSingleSinger && (
        <div className={`singer-edge-frame ${isCurrentlySinging ? 'singing' : 'quiet'}`} />
      )}

      {/* Atmospheric Orbs Constellation — hidden on mobile via CSS */}
      {!isSingleSinger && (
        <div className="ambient-orbs-container">
          {ORBS.map((orb) => {
            // Check main vs background (bracket) activity
            const mainStr = activeSinger ? activeSinger.replace(/\([^)]+\)/g, '') : '';
            const bgMatch = activeSinger ? activeSinger.match(/\(([^)]+)\)/) : null;
            const bgStr = bgMatch ? bgMatch[1] : '';

            const mainList = mainStr.split(/\||,|&/).map(s => s.trim().toLowerCase()).filter(Boolean);
            const bgList = bgStr.split(/\||,|&/).map(s => s.trim().toLowerCase()).filter(Boolean);

            const orbName = orb.name.toLowerCase();
            const isAllMain = mainList.includes('all');
            const isAllBg = bgList.includes('all');

            const isMainActive = isAllMain || mainList.includes(orbName);
            const isBgActive = !isMainActive && (isAllBg || bgList.includes(orbName));

            const colorDef = getSingerColor(orb.name);
            return (
              <div
                key={orb.name}
                className={`ambient-orb ${isMainActive ? 'orb-active' : ''} ${isBgActive ? 'orb-bg-active' : ''}`}
                style={{
                  ...orb.pos,
                  '--orb-color': colorDef.primary,
                  '--orb-glow': colorDef.glow,
                  animationDelay: orb.animDelay,
                }}
              >
                {getArtistProfileImage(orb.name) && (
                  <img
                    src={getArtistProfileImage(orb.name)}
                    alt={orb.name}
                    className="ambient-orb-img"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── DESKTOP: Header ── */}
      <div className="lyrics-header cinematic-hide">
        <button className="lyrics-close-btn" onClick={handleClose} aria-label="Back">
          <svg fill="currentColor" width="24" height="24" viewBox="0 0 24 24">
            <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z" />
          </svg>
        </button>
        <div className="lyrics-header-info">
          <img
            src={albumData?.cover}
            alt={albumData?.title}
            className="lyrics-album-art"
          />
          <div className="lyrics-song-meta">
            <span className="lyrics-song-title">{activeSong?.name}</span>
            <span className="lyrics-song-artist">
              {albumData?.title} · {albumData?.member || 'BTS'}
            </span>
          </div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <KaraokeButton
            isActive={karaokeMode}
            onClick={() => karaokeMode ? cancelKaraoke() : startKaraoke()}
          />
        </div>
      </div>

      {/* ── MOBILE: Header with Song/Lyrics tabs + icons ── */}
      <div className="mlyr-header">
        <div className="mlyr-tabs">
          <button className="mlyr-tab" onClick={handleClose}>Song</button>
          <button className="mlyr-tab mlyr-tab-active">lyrics</button>
        </div>
        <div className="mlyr-header-icons">
          <button className="mlyr-icon-btn" aria-label="Favorite">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
          <button className="mlyr-icon-btn" aria-label="Star">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
          <button className="mlyr-icon-btn" aria-label="Share">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── MOBILE: Floating Vinyl Disc on Left Edge ── */}
      <div className="mlyr-vinyl-float">
        <div className="mlyr-vinyl-disc">
          <img src={albumData?.cover} alt={albumData?.title} className="mlyr-vinyl-art" />
          <div className="mlyr-vinyl-hole" />
        </div>
        <div
          className="mlyr-vinyl-progress-dot"
          style={{
            transform: `rotate(${(progress / 100) * 360 - 90}deg) translateX(72px)`,
          }}
        />
      </div>

      {/* Main lyrics area */}
      {loading ? (
        <div className="lyrics-empty">
          <div className="lyrics-empty-icon">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20,16a2.9,2.9,0,0,0-3-3v6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              <path d="M17,19a2,2,0,1,1-2-2A2,2,0,0,1,17,19ZM8,11h5M8,15h3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              <path d="M9,19H5a1,1,0,0,1-1-1V4A1,1,0,0,1,5,3H16a1,1,0,0,1,1,1V9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            </svg>
          </div>
          <p className="lyrics-empty-text">Loading lyrics…</p>
        </div>
      ) : hasLyrics ? (
        <div className="lyrics-scroll-area" ref={scrollRef}>
          {/* Spacer so first line starts centered */}
          <div style={{ height: '30vh' }} />

          {lines.map((line, i) => {
            const isActive = i === activeIndex;
            const isPast = i < activeIndex;

            // Parse singer tokens (split by comma, but not inside parentheses)
            const tokens = line.singer ? line.singer.split(/,(?![^()]*\))/).map(s => s.trim()) : [];
            const bgTokens = tokens.filter(t => t.startsWith('(')).map(t => t.slice(1, -1));
            const mainTokens = tokens.filter(t => !t.startsWith('('));

            // Helper to generate specific styles for a set of names
            const getStyleForNames = (names, isMain) => {
              let resolvedNames = [...names];
              if (resolvedNames.some(n => n.toLowerCase() === 'all')) {
                // Replace 'all' with the list of unique singers in the song
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
                  filter: `drop-shadow(0 0 10px ${colors[0].glow}) drop-shadow(0 0 20px ${colors[colors.length - 1].glow})`,
                  opacity: 0.9
                };
              }
            };

            const bgStyles = bgTokens.map(t => getStyleForNames(t.split(/\||,|&/).map(s => s.trim()).filter(Boolean), false));

            const mainNames = mainTokens.flatMap(t => t.split(/\||,|&/)).map(s => s.trim()).filter(Boolean);
            const mainStyle = getStyleForNames(mainNames, true);

            // Helper to render bracketed text in the background singer's color/gradient
            const renderLyricText = (line, bgStyles, mainStyle) => {
              if (line.singer === 'Instrumental') return '♪ ♪ ♪';
              if (line.singer === 'End') return '';

              const text = line.text;
              if (!text.includes('(')) return <span style={mainStyle}>{text}</span>;

              // Split text by parentheses but keep them in the tokens
              const parts = text.split(/(\([^)]+\))/g);
              let bgIdx = 0;

              return parts.map((part, index) => {
                if (part.startsWith('(') && part.endsWith(')')) {
                  // Use specific bg style for this bracket index, or fallback to the last bg style or main style
                  const style = bgStyles[bgIdx++] || bgStyles[bgStyles.length - 1] || mainStyle;
                  return (
                    <span key={index} style={style}>
                      {part}
                    </span>
                  );
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
                <div
                  className="lyric-line-text"
                >
                  {renderLyricText(line, bgStyles, mainStyle)}
                </div>
              </div>
            );
          })}

          {/* Bottom spacer */}
          <div style={{ height: '35vh' }} />
        </div>
      ) : (
        <div className="lyrics-empty">
          <div className="lyrics-empty-icon">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20,16a2.9,2.9,0,0,0-3-3v6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              <path d="M17,19a2,2,0,1,1-2-2A2,2,0,0,1,17,19ZM8,11h5M8,15h3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              <path d="M9,19H5a1,1,0,0,1-1-1V4A1,1,0,0,1,5,3H16a1,1,0,0,1,1,1V9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            </svg>
          </div>
          <p className="lyrics-empty-text">No lyrics available</p>
          <p className="lyrics-empty-sub">Lyrics coming soon for this track</p>
        </div>
      )}

      {/* ── DESKTOP: Bottom player bar ── */}
      <div className="lyrics-player-bar cinematic-hide">
        <div className="lyrics-seek-row">
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

        <div className="lyrics-controls-row">
          <button
            className={`lyr-ctrl-btn ${shuffleMode ? 'ctrl-active' : ''}`}
            onClick={toggleShuffle}
            aria-label="Shuffle"
            title={shuffleMode ? 'Shuffle on' : 'Shuffle off'}
            style={{ opacity: shuffleMode ? 1 : 0.6 }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
            </svg>
          </button>

          <button
            className="lyr-ctrl-btn"
            onClick={playPrev}
            aria-label="Previous"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
            </svg>
          </button>

          <PlayPauseAnimButton
            isPlaying={isPlaying}
            onClick={() => setIsPlaying(!isPlaying)}
            className="lyr-ctrl-btn lyr-play-btn"
          />

          <button
            className="lyr-ctrl-btn"
            onClick={playNext}
            aria-label="Next"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>

          <button
            className={`lyr-ctrl-btn ${repeatMode !== 'off' ? 'ctrl-active' : ''}`}
            onClick={cycleRepeat}
            aria-label="Repeat"
            title={repeatMode === 'off' ? 'Repeat off' : repeatMode === 'all' ? 'Repeat all' : 'Repeat one'}
            style={{ position: 'relative', opacity: repeatMode !== 'off' ? 1 : 0.6 }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
            </svg>
            {repeatMode === 'one' && <span className="repeat-one-badge" style={{ position: 'absolute', top: 0, right: 0, fontSize: '9px', background: '#fff', color: '#000', borderRadius: '50%', width: '12px', height: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>1</span>}
          </button>
        </div>
      </div>

      {/* ── MOBILE: Bottom bar with song info + minimal controls ── */}
      <div className="mlyr-bottom-bar">
        <div className="mlyr-bottom-info">
          <span className="mlyr-bottom-title">{activeSong?.name}</span>
          <span className="mlyr-bottom-artist">{albumData?.member || albumData?.title}</span>
        </div>
        <div className="mlyr-bottom-controls">
          <button
            className={`mlyr-bottom-btn ${shuffleMode ? 'ctrl-active' : ''}`}
            onClick={toggleShuffle}
            aria-label="Shuffle"
            style={{ opacity: shuffleMode ? 1 : 0.6 }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
            </svg>
          </button>
          
          <button className="mlyr-bottom-btn" onClick={playPrev} aria-label="Previous">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
            </svg>
          </button>
          <PlayPauseAnimButton
            isPlaying={isPlaying}
            onClick={() => setIsPlaying(!isPlaying)}
            className="mlyr-bottom-play"
          />
          <button className="mlyr-bottom-btn" onClick={playNext} aria-label="Next">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>

          <button
            className={`mlyr-bottom-btn ${repeatMode !== 'off' ? 'ctrl-active' : ''}`}
            onClick={cycleRepeat}
            aria-label="Repeat"
            style={{ position: 'relative', opacity: repeatMode !== 'off' ? 1 : 0.6 }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
            </svg>
            {repeatMode === 'one' && <span className="repeat-one-badge" style={{ position: 'absolute', top: '-2px', right: '-2px', fontSize: '8px', background: '#fff', color: '#000', borderRadius: '50%', width: '10px', height: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>1</span>}
          </button>
        </div>
      </div>

      {/* ── Floating Edit Timestamps button (bottom-right, only when lyrics exist) ── */}
      {hasLyrics && (
        <button
          className="lyrics-edit-fab cinematic-hide"
          onClick={() => {
            handleClose();
            setTimeout(() => window.location.href = '/lyrics-sync?song=' + encodeURIComponent(activeSong.name), 400);
          }}
          title="Edit Timestamps"
          aria-label="Edit Timestamps"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.001 1.001 0 000-1.41l-2.34-2.34a1.001 1.001 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
          </svg>
        </button>
      )}
    </div>
  );
}
