import { useState, useContext } from 'react';
import { AudioContext } from '../AudioPlayerProvider';
import './PlayPauseAnimButton.css';

export default function PlayPauseAnimButton({ isPlaying, onClick, className = '' }) {
  const { albumData } = useContext(AudioContext);
  const [pulse, setPulse] = useState(false);

  const handleClick = (e) => {
    if (e) e.stopPropagation();
    
    // Trigger visual pulse + particle state
    setPulse(false);
    // slight delay to restart animation
    setTimeout(() => setPulse(true), 10);
    
    if (onClick) onClick(e);
  };

  const accentColor = albumData?.color || 'rgba(255, 255, 255, 0.4)';

  return (
    <button 
      className={`premium-play-pause-btn coin-toss-btn ${isPlaying ? 'is-playing' : 'is-paused'} ${className}`}
      onClick={handleClick}
      aria-label={isPlaying ? "Pause" : "Play"}
      style={{ '--coin-glow': accentColor }}
    >
       <div className={`coin-wrapper ${pulse ? 'pulse-anim' : ''}`}>
         
         {/* The 3D spinning coin object */}
         <div className="coin-inner">
           {/* Play Icon (Front of Coin) */}
           <div className="icon-play coin-face">
            <svg viewBox="0 0 24 24" fill="currentColor">
              {/* Soft rounded play triangle */}
              <path d="M7 6v12c0 1.1.9 2 2 2 .3 0 .7-.1 1-.3l10-6c.8-.5 1.1-1.5.6-2.3-.2-.3-.5-.5-.8-.6l-10-6C8.8 4.2 7.7 4.5 7.2 5.5c-.1.1-.2.3-.2.5z" />
            </svg>
         </div>
         
           {/* Pause Icon (Back of Coin) */}
           <div className="icon-pause coin-face coin-back">
              <svg viewBox="0 0 24 24" fill="currentColor">
                {/* Soft rounded pause bars */}
                <path d="M8 19c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2s-2 .9-2 2v10c0 1.1.9 2 2 2zm6-12v10c0 1.1.9 2 2 2s2-.9 2-2V7c0-1.1-.9-2-2-2s-2 .9-2 2z" />
              </svg>
           </div>
         </div>
       </div>
    </button>
  );
}
