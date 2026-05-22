import { useEffect, useRef, useState } from "react";
import "./FlyToQueue.css";

/**
 * Album art flies in a natural arc toward the queue icon,
 * then shrinks + dissolves with a burst ring at the target.
 */
export default function FlyToQueue({ sourceRect, targetRect, songName, cover, onComplete }) {
  const ghostRef = useRef(null);
  const burstRef = useRef(null);
  const [showBurst, setShowBurst] = useState(false);
  const [burstPos, setBurstPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!sourceRect || !targetRect) { onComplete?.(); return; }

    const ghost = ghostRef.current;
    if (!ghost) return;

    // Source center
    const sx = sourceRect.left + sourceRect.width / 2;
    const sy = sourceRect.top + sourceRect.height / 2;

    // Target center (queue icon)
    const tx = targetRect.left + targetRect.width / 2;
    const ty = targetRect.top + targetRect.height / 2;

    // Arc control point — bow upward (or toward center of screen)
    const midX = (sx + tx) / 2;
    const arcHeight = Math.max(80, Math.abs(ty - sy) * 0.5);
    // Arc goes UP (above the line between source and target)
    const cpY = Math.min(sy, ty) - arcHeight;

    const size = Math.min(sourceRect.width, sourceRect.height, 56);
    const DURATION = 620; // ms
    const STEPS = 60;

    // Position ghost at source
    ghost.style.width = `${size}px`;
    ghost.style.height = `${size}px`;
    ghost.style.left = `${sx - size / 2}px`;
    ghost.style.top = `${sy - size / 2}px`;

    let start = null;

    function easeInOut(t) {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    function quadBezier(t, p0, p1, p2) {
      const mt = 1 - t;
      return mt * mt * p0 + 2 * mt * t * p1 + t * t * p2;
    }

    function step(ts) {
      if (!start) start = ts;
      const raw = Math.min((ts - start) / DURATION, 1);
      const t = easeInOut(raw);

      // Quadratic bezier arc
      const cx = quadBezier(t, sx, midX, tx);
      const cy = quadBezier(t, sy, cpY, ty);

      const scale = 1 - t * 0.85; // shrink toward target
      const opacity = raw < 0.85 ? 1 : 1 - ((raw - 0.85) / 0.15);

      ghost.style.transform = `translate(${cx - sx}px, ${cy - sy}px) scale(${scale})`;
      ghost.style.opacity = opacity;

      if (raw < 1) {
        requestAnimationFrame(step);
      } else {
        // Trigger burst at target position
        setBurstPos({ x: tx, y: ty });
        setShowBurst(true);
        setTimeout(() => {
          onComplete?.();
        }, 350);
      }
    }

    requestAnimationFrame(step);
  }, [sourceRect, targetRect]);

  if (!sourceRect) return null;

  return (
    <>
      {/* Flying album art ghost */}
      <div className="ftq-ghost" ref={ghostRef}>
        {cover ? (
          <img src={cover} alt={songName} className="ftq-ghost-img" />
        ) : (
          <div className="ftq-ghost-fallback">
            <svg viewBox="0 0 24 24" fill="white" width="20" height="20">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
        )}
        {/* Subtle shine overlay */}
        <div className="ftq-ghost-shine" />
      </div>

      {/* Burst ring at queue icon */}
      {showBurst && (
        <div
          className="ftq-burst"
          ref={burstRef}
          style={{ left: burstPos.x, top: burstPos.y }}
        >
          <div className="ftq-burst-ring" />
          <div className="ftq-burst-ring ftq-burst-ring-2" />
          <div className="ftq-burst-dots">
            {[...Array(6)].map((_, i) => (
              <span key={i} className="ftq-burst-dot" style={{ '--i': i }} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
