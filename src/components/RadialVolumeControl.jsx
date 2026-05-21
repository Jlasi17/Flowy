import { useState, useRef, useEffect } from 'react';
import './RadialVolumeControl.css';

export default function RadialVolumeControl({ volume, onVolumeChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  let closeTimeout = useRef(null);
  const lastVolumeRef = useRef(volume > 0 ? volume : 80);

  useEffect(() => {
    if (volume > 0) {
      lastVolumeRef.current = volume;
    }
  }, [volume]);

  const radius = 50;
  const centerX = 60;
  const centerY = 60;

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
    // pointer position relative to SVG
    const ptrX = e.clientX - rect.left;
    const ptrY = e.clientY - rect.top;

    const dx = ptrX - centerX;
    // Cap `ptrY` to at most `centerY` so dragging below the center doesn't snap abruptly
    const dy = Math.min(ptrY - centerY, 0); 
    
    // If they are exactly at the center (dx=0, dy=0), don't update
    if (dx === 0 && dy === 0) return;

    let angle = Math.atan2(dy, dx); 
    
    // If angle is positive, it means they moved to the left edge or slightly below the capped line.
    // Math.atan2(0, -x) gives Math.PI. Since it's the left side, it should be -Math.PI (vol 0).
    if (angle > 0) {
      if (dx < 0) angle = -Math.PI; 
      else angle = 0; 
    }

    const newVolume = Math.round(((angle + Math.PI) / Math.PI) * 100);
    // ensure within 0 and 100 bounds
    const clampedVol = Math.max(0, Math.min(100, newVolume));
    
    // Simulate an event object since the parent expects onChange={e => e.target.value}
    // but the original handleVolume is standard e.target.value
    // We will just pass the value directly if we rewrite the handler or spoof it.
    // Let's pass it as a fake event for now, or assume we can rewrite handleVolume.
    // In PersistentAudioPlayer, it's (e) => { const val = Number(e.target.value); ... }
    onVolumeChange({ target: { value: clampedVol } });
  };

  // We no longer manually calculate x and y for rendering, we'll use CSS rotates and dashoffsets for perfect circular transitions!
  const handleEnter = () => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
    setIsOpen(true);
  };

  const handleLeave = () => {
    if (isDragging) return; // Keep open while dragging
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
    // Prevent default or bubbling so it doesn't close immediately if we have weird focus handlers
    e.preventDefault();
    if (volume > 0) {
      onVolumeChange({ target: { value: 0 } });
    } else {
      onVolumeChange({ target: { value: lastVolumeRef.current || 50 } });
    }
  };

  return (
    <div 
      className="radial-vol-wrapper" 
      ref={containerRef}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
    >
      <button 
        className="vol-trigger" 
        aria-label="Toggle Mute" 
        onClick={handleToggleMute}
      >
        {volume === 0 ? (
          <svg fill="currentColor" width="20" height="20" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
            <path d="M35.735,24.4l4.542-4.548c0.39-0.392,0.39-1.024-0.001-1.415c-0.391-0.389-1.024-0.39-1.415,0.001l-4.545,4.552 l-4.545-4.552c-0.391-0.391-1.024-0.39-1.415-0.001c-0.391,0.391-0.391,1.023-0.001,1.415l4.542,4.548l-4.542,4.547 c-0.39,0.392-0.39,1.024,0.001,1.415c0.195,0.194,0.451,0.292,0.707,0.292s0.513-0.098,0.708-0.293l4.545-4.551l4.545,4.551 c0.195,0.195,0.452,0.293,0.708,0.293s0.512-0.098,0.707-0.292c0.391-0.391,0.391-1.023,0.001-1.415L35.735,24.4z"></path>
            <path d="M22.642,38.06c0.152,0,0.306-0.035,0.448-0.105c0.338-0.17,0.552-0.516,0.552-0.895v-24c0-0.379-0.214-0.725-0.552-0.895 c-0.341-0.168-0.744-0.132-1.047,0.094l-8.2,6.134H9.569c-0.553,0-1,0.447-1,1v11.334c0,0.553,0.447,1,1,1h4.273l8.2,6.134 C22.219,37.992,22.43,38.06,22.642,38.06z M21.642,35.063l-6.867-5.137c-0.173-0.129-0.383-0.199-0.599-0.199h-3.606v-9.334h3.606 c0.216,0,0.426-0.07,0.599-0.199l6.867-5.137V35.063z"></path>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="-2.4 -2.4 28.80 28.80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3.15838 13.9306C2.44537 12.7423 2.44537 11.2577 3.15838 10.0694V10.0694C3.37596 9.70674 3.73641 9.45272 4.1511 9.36978L5.84413 9.03117C5.94499 9.011 6.03591 8.95691 6.10176 8.87788L8.17085 6.39498C9.3534 4.97592 9.94468 4.26638 10.4723 4.45742C11 4.64846 11 5.57207 11 7.41928L11 16.5807C11 18.4279 11 19.3515 10.4723 19.5426C9.94468 19.7336 9.3534 19.0241 8.17085 17.605L6.10176 15.1221C6.03591 15.0431 5.94499 14.989 5.84413 14.9688L4.1511 14.6302C3.73641 14.5473 3.37596 14.2933 3.15838 13.9306V13.9306Z" stroke="currentColor" strokeWidth="1.608"></path>
            <path d="M15.5355 8.46447C16.4684 9.39732 16.9948 10.6611 17 11.9803C17.0052 13.2996 16.4888 14.5674 15.5633 15.5076" stroke="currentColor" strokeWidth="1.608" strokeLinecap="round"></path>
          </svg>
        )}
      </button>

      <div className={`radial-panel ${isOpen ? 'open' : ''}`}>
        <svg 
          ref={svgRef} 
          width="120" 
          height="70" 
          viewBox="0 0 120 70" 
          className="radial-svg"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ touchAction: 'none' }} // crucial for slider
        >
          {/* Background full semi-circle slice using a thick stroke */}
          <path 
            d="M 35 60 A 25 25 0 0 1 85 60"
            fill="none" 
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="50"
          />
          {/* Active filled volume slice animated spherically via offset */}
          <path 
            pathLength="100"
            d="M 35 60 A 25 25 0 0 1 85 60"
            fill="none" 
            stroke="url(#gradient-vol)" 
            strokeWidth="50"
            strokeDasharray="100"
            strokeDashoffset={100 - volume}
            style={{ transition: isDragging ? 'none' : 'stroke-dashoffset 0.35s cubic-bezier(0.2, 0.9, 0.3, 1)' }}
          />

          {/* Gradients */}
          <defs>
            <radialGradient id="gradient-vol" cx="50%" cy="100%" r="100%">
              <stop offset="0%" stopColor="#ffb6c1" stopOpacity="0.85" />
              <stop offset="70%" stopColor="#add8e6" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#87ceeb" stopOpacity="1" />
            </radialGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Handle shadow */}
          <circle 
            cx="10" 
            cy="60" 
            r="8" 
            fill="rgba(0,0,0,0.4)" 
            filter="blur(2px)" 
            style={{ 
              transform: `rotate(${volume * 1.8}deg)`,
              transformOrigin: '60px 60px',
              transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1)' 
            }}
          />
          
          {/* Draggable Handle */}
          <circle 
            cx="10" 
            cy="60" 
            r="8" 
            fill="#ffffff" 
            cursor="grab"
            filter="url(#glow)"
            style={{ 
              transform: `rotate(${volume * 1.8}deg)`,
              transformOrigin: '60px 60px',
              transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1)',
              cursor: isDragging ? 'grabbing' : 'grab'
            }}
          />
        </svg>
      </div>
    </div>
  );
}
