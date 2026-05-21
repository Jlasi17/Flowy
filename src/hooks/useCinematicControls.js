import { useState, useEffect, useRef, useContext } from 'react';
import { AudioContext } from '../AudioPlayerProvider';

export function useCinematicControls({ isActive }) {
  const {
    audioRef,
    isPlaying,
    setIsPlaying,
    volume,
    updateVolume,
  } = useContext(AudioContext);

  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const hideTimeoutRef = useRef(null);
  const lastVolumeRef = useRef(volume || 80);

  const resetHideTimer = () => {
    setIsControlsVisible(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    
    if (isActive) {
      hideTimeoutRef.current = setTimeout(() => {
        setIsControlsVisible(false);
      }, 3500); // Hide after 3.5 seconds
    }
  };

  // ── EFFECT 1: Reset timer on user activity ──
  useEffect(() => {
    if (!isActive) {
      setIsControlsVisible(true);
      return;
    }

    const handleUserActivity = () => resetHideTimer();
    
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('mousedown', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);

    // Initial trigger
    resetHideTimer();

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('mousedown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [isActive, isPlaying]);

  // ── EFFECT 2: Hide system mouse cursor ──
  useEffect(() => {
    if (isActive && !isControlsVisible) {
      document.body.style.cursor = 'none';
    } else {
      document.body.style.cursor = 'default';
    }

    return () => {
      document.body.style.cursor = 'default';
    };
  }, [isActive, isControlsVisible]);


  return { isControlsVisible };
}
