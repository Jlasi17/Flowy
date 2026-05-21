import { useRef, useState, useCallback, useEffect } from "react";
import "./FastScrollHandle.css";

/**
 * FastScrollHandle
 *
 * A floating dot that the user can long-press to activate a fast-scroll
 * track.  While activated, dragging vertically scrubs through `total` items
 * by calling `onIndex(i)`.
 *
 * Props:
 *   total    - number of items (albums)
 *   current  - currently active index
 *   onIndex  - callback(index) called while scrubbing
 */
export default function FastScrollHandle({ total, current, onIndex }) {
  const [active, setActive]       = useState(false);   // long-press triggered
  const [dragging, setDragging]   = useState(false);
  const [trackY, setTrackY]       = useState(0);       // thumb Y within track (px)
  const [fadeOut, setFadeOut]     = useState(false);   // fade-out animation

  const longPressTimer  = useRef(null);
  const trackRef        = useRef(null);
  const startYRef       = useRef(0);
  const startIndexRef   = useRef(0);
  const velocityRef     = useRef(0);
  const lastYRef        = useRef(0);
  const lastTRef        = useRef(0);
  const momentumRAF     = useRef(null);
  const TRACK_H         = 200; // px — matches CSS

  // Sync thumb position when current changes externally
  useEffect(() => {
    if (!dragging && total > 1) {
      setTrackY((current / (total - 1)) * TRACK_H);
    }
  }, [current, total, dragging]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const yToIndex = (y) => Math.round(clamp(y / TRACK_H, 0, 1) * (total - 1));

  const triggerIndex = useCallback((y) => {
    const idx = yToIndex(y);
    if (idx !== current) onIndex(idx);
    setTrackY(clamp(y, 0, TRACK_H));
  }, [current, onIndex, total]);

  // ── Long press start ─────────────────────────────────────────────────────

  const handlePointerDown = useCallback((e) => {
    e.stopPropagation();
    longPressTimer.current = setTimeout(() => {
      setActive(true);
      setFadeOut(false);
      setDragging(true);
      startYRef.current    = e.clientY;
      startIndexRef.current = current;
      lastYRef.current     = e.clientY;
      lastTRef.current     = performance.now();
      velocityRef.current  = 0;
    }, 350); // 350ms long-press threshold
  }, [current]);

  const handleTouchStart = useCallback((e) => {
    const t = e.touches[0];
    longPressTimer.current = setTimeout(() => {
      setActive(true);
      setFadeOut(false);
      setDragging(true);
      startYRef.current    = t.clientY;
      startIndexRef.current = current;
      lastYRef.current     = t.clientY;
      lastTRef.current     = performance.now();
      velocityRef.current  = 0;
    }, 350);
  }, [current]);

  // ── Cancel long press if finger/pointer lifts quickly ───────────────────

  const cancelLongPress = useCallback(() => {
    clearTimeout(longPressTimer.current);
  }, []);

  // ── Drag move ────────────────────────────────────────────────────────────

  const handleMove = useCallback((clientY) => {
    if (!dragging) return;

    const now   = performance.now();
    const dt    = now - lastTRef.current;
    const dy    = clientY - lastYRef.current;

    // track velocity (px/ms) for momentum
    if (dt > 0) velocityRef.current = dy / dt;
    lastYRef.current = clientY;
    lastTRef.current = now;

    // Map Y delta → index delta (sensitivity: full track = all albums)
    const deltaY = clientY - startYRef.current;
    const newY   = (startIndexRef.current / (total - 1)) * TRACK_H + deltaY;
    triggerIndex(newY);
  }, [dragging, total, triggerIndex]);

  const handlePointerMove = useCallback((e) => {
    if (!dragging) return;
    e.preventDefault();
    handleMove(e.clientY);
  }, [dragging, handleMove]);

  const handleTouchMove = useCallback((e) => {
    if (!dragging) return;
    e.preventDefault();
    handleMove(e.touches[0].clientY);
  }, [dragging, handleMove]);

  // ── Release ──────────────────────────────────────────────────────────────

  const handleRelease = useCallback(() => {
    cancelLongPress();
    if (!dragging) return;

    // Momentum scroll
    let v = velocityRef.current; // px/ms
    const decay = 0.94;

    const step = () => {
      v *= decay;
      if (Math.abs(v) < 0.05) {
        cancelAnimationFrame(momentumRAF.current);
        return;
      }
      setTrackY(prev => {
        const next = clamp(prev + v * 16, 0, TRACK_H); // ~16ms frame
        onIndex(yToIndex(next));
        return next;
      });
      momentumRAF.current = requestAnimationFrame(step);
    };
    momentumRAF.current = requestAnimationFrame(step);

    // Start collapse animation
    setDragging(false);
    setFadeOut(true);
    setTimeout(() => {
      setActive(false);
      setFadeOut(false);
    }, 400);
  }, [dragging, cancelLongPress, onIndex, total]);

  // Attach global pointer/touch listeners when dragging
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => handleMove(e.clientY ?? e.touches?.[0]?.clientY);
    const onUp   = () => handleRelease();

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup",   onUp);
    window.addEventListener("touchmove",   (e) => handleMove(e.touches[0].clientY), { passive: false });
    window.addEventListener("touchend",    onUp);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup",   onUp);
      window.removeEventListener("touchmove",   onMove);
      window.removeEventListener("touchend",    onUp);
    };
  }, [dragging, handleMove, handleRelease]);

  // Cleanup momentum on unmount
  useEffect(() => () => cancelAnimationFrame(momentumRAF.current), []);

  const thumbPercent = total > 1 ? (trackY / TRACK_H) * 100 : 0;

  return (
    <div className={`fsh-root ${active ? "fsh-active" : ""} ${fadeOut ? "fsh-fadeout" : ""}`}>
      {/* The always-visible dot trigger */}
      <div
        className="fsh-dot"
        onPointerDown={handlePointerDown}
        onPointerUp={cancelLongPress}
        onTouchStart={handleTouchStart}
        onTouchEnd={cancelLongPress}
      />

      {/* Expanded scroll track — only visible when active */}
      {active && (
        <div className="fsh-track-wrap">
          <div className="fsh-track" ref={trackRef}>
            <div
              className="fsh-thumb"
              style={{ top: `${thumbPercent}%` }}
            />
            {/* Index hint label */}
            <div
              className="fsh-label"
              style={{ top: `${thumbPercent}%` }}
            >
              {current + 1} / {total}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
