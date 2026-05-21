import { useState, useContext, useRef } from 'react';
import { AudioContext } from '../AudioPlayerProvider';
import './DualEqualizer.css';

export default function DualEqualizer() {
  return null; // Mixer panel removed as per user request
}

export function VocalQuickToggle() {
  const { vocalVolume, setVocalVolume } = useContext(AudioContext);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastVolume, setLastVolume] = useState(50);
  const timerRef = useRef(null);

  const toggleMute = () => {
    if (vocalVolume > 0) {
      setLastVolume(vocalVolume);
      setVocalVolume(0);
    } else {
      setVocalVolume(lastVolume || 50);
    }
  };

  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsExpanded(true);
  };

  const handleMouseLeave = () => {
    timerRef.current = setTimeout(() => setIsExpanded(false), 800);
  };

  const getIcon = () => {
    return (
      <svg viewBox="0 0 200 200" width="100%" height="100%" style={{ stroke: 'currentColor', fill: 'none' }}>
        <path 
          d="M 35,15 C 35,30 50,35 50,45 C 50,60 10,70 15,105 C 20,135 60,125 55,145 C 50,165 15,160 40,190" 
          strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"
        />
        <line x1="85" y1="45" x2="95" y2="60" strokeWidth="7" strokeLinecap="round" />
        <line x1="115" y1="45" x2="105" y2="60" strokeWidth="7" strokeLinecap="round" />
        <line x1="95" y1="75" x2="115" y2="72" strokeWidth="7" strokeLinecap="round" />
        <path 
          d="M 167,125 Q 185,125 175,155 Q 165,185 190,175" 
          strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" 
        />
        <polygon 
          points="80,95 170,118 165,133 75,110" 
          fill="rgba(255,255,255,0.1)" strokeWidth="7" strokeLinejoin="round" 
        />
        <circle 
          cx="85" cy="100" r="18" 
          fill="rgba(255,255,255,0.1)" strokeWidth="7" 
        />
        <path 
          d="M 72,87 Q 85,95 80,117" 
          strokeWidth="7" strokeLinecap="round" 
        />
        <path 
          d="M 112,110 C 108,90 122,88 125,105 C 130,92 140,92 142,108 C 148,98 158,98 158,112 C 164,105 172,108 168,122 C 165,135 150,140 140,142 L 135,190 L 115,190 L 115,145 C 105,145 95,135 98,120 C 100,110 108,110 112,110 Z" 
          fill="rgba(255,255,255,0.1)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" 
        />
        <g>
          <ellipse cx="145" cy="45" rx="8" ry="6" transform="rotate(-20 145 45)" fill="rgba(255,255,255,0.1)" strokeWidth="7" />
          <line x1="151" y1="43" x2="160" y2="15" strokeWidth="7" strokeLinecap="round" />
          <path d="M 160,15 Q 175,18 165,35" strokeWidth="7" strokeLinecap="round" />
        </g>
        <g>
          <ellipse cx="175" cy="70" rx="8" ry="6" transform="rotate(-20 175 70)" fill="rgba(255,255,255,0.1)" strokeWidth="7" />
          <line x1="181" y1="68" x2="190" y2="40" strokeWidth="7" strokeLinecap="round" />
          <path d="M 190,40 Q 205,43 195,60" strokeWidth="7" strokeLinecap="round" />
        </g>
      </svg>
    );
  };

  return (
    <div 
      className={`vocal-quick-container ${isExpanded ? 'expanded' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="vocal-slider-track-horizontal">
        <input 
          type="range"
          min="0"
          max="100"
          value={vocalVolume}
          onChange={(e) => setVocalVolume(Number(e.target.value))}
          className="vocal-quick-range"
        />
      </div>

      <button 
        className={`vocal-quick-btn ${vocalVolume > 0 ? 'active' : ''}`}
        onClick={toggleMute}
        aria-label="Toggle Vocal Guide"
      >
        <div className="vocal-btn-glow" style={{ opacity: vocalVolume / 100 }} />
        {getIcon()}
        <span className="vocal-toggle-badge">{vocalVolume}%</span>
      </button>
    </div>
  );
}
