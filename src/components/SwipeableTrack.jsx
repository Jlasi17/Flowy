import { useRef, useState } from "react";
import "./SwipeableTrack.css";

/* ─── Haptic helper (debounced) ─── */
let lastVibrate = 0;
const haptic = (ms = 8) => {
  const now = performance.now();
  if (now - lastVibrate < 120) return;
  lastVibrate = now;
  navigator.vibrate?.(ms);
};

export default function SwipeableTrack({ onSwipeAction, onClick, children, actionText = "＋ Queue", actionColor = "rgba(29, 185, 84, 0.4)", disabled = false }) {
  const [translateX, setTranslateX] = useState(0);
  const [thresholdReached, setThresholdReached] = useState(false);
  const containerRef = useRef(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const startTime = useRef(0);
  const isDragging = useRef(false);
  const gestureLocked = useRef(null); // 'horizontal' | 'vertical' | null

  const SWIPE_THRESHOLD = -50;
  const RUBBER_BAND_START = -110;
  const LOCK_DISTANCE = 8; // px before gesture direction locks

  const handlePointerDown = (e) => {
    if (disabled) return;
    isDragging.current = true;
    gestureLocked.current = null;
    startX.current = e.clientX;
    startY.current = e.clientY;
    currentX.current = e.clientX;
    startTime.current = performance.now();
    setThresholdReached(false);
    if (containerRef.current) {
      containerRef.current.style.transition = 'none';
    }
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging.current) return;

    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;

    // Gesture locking: detect direction before committing
    if (!gestureLocked.current) {
      const totalMove = Math.abs(dx) + Math.abs(dy);
      if (totalMove < LOCK_DISTANCE) return; // wait for enough movement
      gestureLocked.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
    }

    // If vertical gesture, bail out — let scroll handle it
    if (gestureLocked.current === 'vertical') return;

    currentX.current = e.clientX;
    let diff = dx;

    // Resist right swipe
    if (diff > 0) {
      diff = diff * 0.12;
    }

    // Rubber-band effect: exponentially dampen beyond threshold
    if (diff < RUBBER_BAND_START) {
      const overshoot = RUBBER_BAND_START - diff;
      const rubberBand = RUBBER_BAND_START - (overshoot * 0.2) / (1 + overshoot * 0.003);
      diff = rubberBand;
    }

    // Check threshold crossing
    const wasReached = thresholdReached;
    const isNowReached = diff < SWIPE_THRESHOLD;
    if (isNowReached && !wasReached) {
      setThresholdReached(true);
      haptic(10);
    } else if (!isNowReached && wasReached) {
      setThresholdReached(false);
    }

    setTranslateX(diff);
  };

  const handlePointerUp = (e) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    e.target.releasePointerCapture(e.pointerId);

    // If it was a vertical gesture, clean up
    if (gestureLocked.current === 'vertical') {
      gestureLocked.current = null;
      return;
    }

    if (containerRef.current) {
      containerRef.current.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.1)';
    }

    const dragTime = performance.now() - startTime.current;
    const dragDistance = translateX;
    const velocity = Math.abs(dragDistance) / dragTime;

    // Fast flick (>0.5 px/ms) with at least 15px, OR threshold met
    if ((velocity > 0.5 && dragDistance < -15) || dragDistance < SWIPE_THRESHOLD) {
      if (onSwipeAction) onSwipeAction(e);
    }

    setTranslateX(0);
    setThresholdReached(false);
    gestureLocked.current = null;
  };

  const handleClick = (e) => {
    if (Math.abs(currentX.current - startX.current) > 5) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    if (onClick) onClick(e);
  };

  // Proportional values for visual feedback
  const absX = Math.abs(Math.min(translateX, 0));
  const progress = Math.min(absX / Math.abs(SWIPE_THRESHOLD), 1); // 0→1
  const contentScale = 1 - progress * 0.03; // 1.0 → 0.97

  return (
    <div className="swipeable-track-wrapper">
      <div
        className={`swipe-action-bg ${thresholdReached ? 'threshold-reached' : ''}`}
        style={{
          opacity: progress * 0.85 + (thresholdReached ? 0.15 : 0),
          background: `linear-gradient(90deg, transparent 40%, ${actionColor} 100%)`
        }}
      >
        <span
          className={`swipe-icon ${thresholdReached ? 'popped' : ''}`}
          style={{
            color: thresholdReached ? '#fff' : `rgba(255,255,255,${0.4 + progress * 0.6})`
          }}
        >
          {actionText === "＋ Queue" ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          ) : (
            <span style={{ marginRight: '6px', fontSize: '1.2rem' }}>✕</span>
          )}
          <span style={{ fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.5px' }}>
            {actionText.replace("＋ ", "").replace("✕ ", "")}
          </span>
        </span>
      </div>
      <div
        className="swipeable-track-content"
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleClick}
        style={{
          transform: `translateX(${translateX}px) scale(${contentScale})`,
          transformOrigin: 'center center'
        }}
      >
        {children}
      </div>
    </div>
  );
}
