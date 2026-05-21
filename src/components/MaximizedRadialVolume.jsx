import { useState, useRef, useEffect, useContext } from 'react';
import { AudioContext } from '../AudioPlayerProvider';
import './MaximizedRadialVolume.css';

export default function MaximizedRadialVolume() {
  const { volume, updateVolume, isPlaying, albumData } = useContext(AudioContext);
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  let closeTimeout = useRef(null);
  const lastVolumeRef = useRef(volume > 0 ? volume : 80);

  // Helper to ensure colors are visible against dark themes
  const getVisibleColor = (colorStr) => {
    if (!colorStr) return '#1db954';
    const str = colorStr.toLowerCase().trim();
    if (['black', 'transparent'].includes(str)) return '#ffffff';

    let r, g, b;
    if (str.startsWith('#')) {
      let hex = str.slice(1);
      if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
      if (hex.length >= 6) {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
      }
    } else if (str.startsWith('rgb')) {
      const matches = str.match(/\d+/g);
      if (matches && matches.length >= 3) {
        r = parseInt(matches[0]);
        g = parseInt(matches[1]);
        b = parseInt(matches[2]);
      }
    }

    if (r !== undefined && g !== undefined && b !== undefined) {
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      if (brightness < 50) return '#ffffff'; // Too dark, switch to white
    }

    return colorStr;
  };

  const centerX = 180;
  const centerY = 20;

  useEffect(() => {
    if (volume > 0) {
      lastVolumeRef.current = volume;
    }
  }, [volume]);

  const handlePointerDown = (e) => {
    setIsDragging(true);
    e.target.setPointerCapture(e.pointerId);
    updateVolumeFromPointer(e);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    updateVolumeFromPointer(e);
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    e.target.releasePointerCapture(e.pointerId);
  };

  const updateVolumeFromPointer = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const ptrX = e.clientX - rect.left;
    const ptrY = e.clientY - rect.top;

    const dx = ptrX - centerX;
    const dy = ptrY - centerY;

    if (dx === 0 && dy === 0) return;

    let angle = Math.atan2(dy, dx);
    // We want angle between PI/2 (90deg, bottom) and PI (180deg, left).
    // If it's outside this quadrant, clamp it.
    if (angle >= 0 && angle < Math.PI / 2) angle = Math.PI / 2; // clamp to bottom
    if (angle < 0 && angle > -Math.PI / 2) angle = Math.PI / 2; // clamp to bottom
    if (angle <= 0 && angle <= -Math.PI / 2) angle = Math.PI; // clamp to left

    // angle goes from PI/2 (vol=0) to Math.PI (vol=100)
    // mapping angle to vol:
    // val = (angle - PI/2) / (PI/2) * 100
    const newVolume = Math.round(((angle - Math.PI / 2) / (Math.PI / 2)) * 100);
    const clampedVol = Math.max(0, Math.min(100, newVolume));

    updateVolume(clampedVol);
  };

  const handleEnter = () => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
    setIsOpen(true);
  };

  const handleLeave = () => {
    if (isDragging) return;
    closeTimeout.current = setTimeout(() => setIsOpen(false), 300);
  };

  useEffect(() => {
    if (!isDragging && !containerRef.current?.matches(':hover')) {
      handleLeave();
    } else if (isDragging) {
      handleEnter();
    }
  }, [isDragging]);

  const handleToggleMute = (e) => {
    e.preventDefault();
    if (volume > 0) {
      updateVolume(0);
    } else {
      updateVolume(lastVolumeRef.current || 50);
    }
  };

  const accentColor = getVisibleColor(albumData?.color);

  // Generate background radiation waves
  const waveLines = Array.from({ length: 22 }).map((_, i) => {
    const angle = Math.PI / 2 + (i / 21) * (Math.PI / 2);
    const innerR = 178;
    const x1 = centerX + innerR * Math.cos(angle);
    const y1 = centerY + innerR * Math.sin(angle);
    const x2 = centerX + (innerR + 10) * Math.cos(angle);
    const y2 = centerY + (innerR + 10) * Math.sin(angle);

    // Animation intensity matches volume
    const volRatio = volume / 100;
    const scaleFactor = isPlaying ? 1 + (Math.random() * 0.8 + 0.2) * volRatio * 1.5 : 1;

    return (
      <line
        key={i}
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={accentColor}
        strokeWidth="3"
        strokeLinecap="round"
        className="radial-wave-line"
        style={{
          transformOrigin: `${x1}px ${y1}px`,
          animationDelay: `${Math.random() * 0.5}s`,
          animationDuration: `${0.3 + Math.random() * 0.4}s`,
          '--target-scale': scaleFactor,
          opacity: 0.3 + (volRatio * 0.7),
          animationPlayState: isPlaying ? 'running' : 'paused'
        }}
      />
    );
  });

  return (
    <div
      className="max-radial-vol-wrapper"
      ref={containerRef}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
    >
      <button
        className="max-vol-trigger max-close-btn"
        aria-label="Toggle Mute"
        onClick={handleToggleMute}
        style={{ '--glow-color': accentColor }}
      >
        {volume === 0 ? (
          <svg fill="currentColor" width="24" height="24" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
            <path d="M35.735,24.4l4.542-4.548c0.39-0.392,0.39-1.024-0.001-1.415c-0.391-0.389-1.024-0.39-1.415,0.001l-4.545,4.552 l-4.545-4.552c-0.391-0.391-1.024-0.39-1.415-0.001c-0.391,0.391-0.391,1.023-0.001,1.415l4.542,4.548l-4.542,4.547 c-0.39,0.392-0.39,1.024,0.001,1.415c0.195,0.194,0.451,0.292,0.707,0.292s0.513-0.098,0.708-0.293l4.545-4.551l4.545,4.551 c0.195,0.195,0.452,0.293,0.708,0.293s0.512-0.098,0.707-0.292c0.391-0.391,0.391-1.023,0.001-1.415L35.735,24.4z"></path>
            <path d="M22.642,38.06c0.152,0,0.306-0.035,0.448-0.105c0.338-0.17,0.552-0.516,0.552-0.895v-24c0-0.379-0.214-0.725-0.552-0.895 c-0.341-0.168-0.744-0.132-1.047,0.094l-8.2,6.134H9.569c-0.553,0-1,0.447-1,1v11.334c0,0.553,0.447,1,1,1h4.273l8.2,6.134 C22.219,37.992,22.43,38.06,22.642,38.06z M21.642,35.063l-6.867-5.137c-0.173-0.129-0.383-0.199-0.599-0.199h-3.606v-9.334h3.606 c0.216,0,0.426-0.07,0.599-0.199l6.867-5.137V35.063z"></path>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="-2.4 -2.4 28.80 28.80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3.15838 13.9306C2.44537 12.7423 2.44537 11.2577 3.15838 10.0694V10.0694C3.37596 9.70674 3.73641 9.45272 4.1511 9.36978L5.84413 9.03117C5.94499 9.011 6.03591 8.95691 6.10176 8.87788L8.17085 6.39498C9.3534 4.97592 9.94468 4.26638 10.4723 4.45742C11 4.64846 11 5.57207 11 7.41928L11 16.5807C11 18.4279 11 19.3515 10.4723 19.5426C9.94468 19.7336 9.3534 19.0241 8.17085 17.605L6.10176 15.1221C6.03591 15.0431 5.94499 14.989 5.84413 14.9688L4.1511 14.6302C3.73641 14.5473 3.37596 14.2933 3.15838 13.9306V13.9306Z" stroke="currentColor" strokeWidth="1.608"></path>
            <path d="M15.5355 8.46447C16.4684 9.39732 16.9948 10.6611 17 11.9803C17.0052 13.2996 16.4888 14.5674 15.5633 15.5076" stroke="currentColor" strokeWidth="1.608" strokeLinecap="round"></path>
          </svg>
        )}
      </button>

      <div className={`max-radial-panel ${isOpen ? 'open' : ''}`}>
        <svg
          ref={svgRef}
          width="200"
          height="200"
          viewBox="0 0 200 200"
          className="max-radial-svg"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ touchAction: 'none' }}
        >
          <defs>
            <filter id="max-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            {/* The line gradient */}
            <radialGradient id="max-grad" cx="100%" cy="0%" r="100%">
              <stop offset="0%" stopColor="#fff" />
              <stop offset="100%" stopColor={accentColor} />
            </radialGradient>
          </defs>

          {/* Sound Waves */}
          {waveLines}

          {/* Background Track */}
          <path
            d="M 180 180 A 160 160 0 0 1 20 20"
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="10"
            strokeLinecap="round"
          />

          {/* Active Track */}
          <path
            pathLength="100"
            d="M 180 180 A 160 160 0 0 1 20 20"
            fill="none"
            stroke="url(#max-grad)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray="100"
            strokeDashoffset={100 - volume}
            filter="url(#max-glow)"
            style={{
              transition: isDragging ? 'none' : 'stroke-dashoffset 0.35s cubic-bezier(0.2, 0.9, 0.3, 1)',
              opacity: 0.8 + (volume / 500)
            }}
          />

          {/* Draggable Handle */}
          <circle
            cx="180"
            cy="180"
            r="12"
            fill="#ffffff"
            cursor="grab"
            filter="url(#max-glow)"
            style={{
              transform: `rotate(${volume * 0.9}deg)`, /* 0 to 90 degrees */
              transformOrigin: '180px 20px',
              transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1)',
              cursor: isDragging ? 'grabbing' : 'grab',
              boxShadow: `0 0 10px ${accentColor}`
            }}
          />
        </svg>
      </div>
    </div>
  );
}