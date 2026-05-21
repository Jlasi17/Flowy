import { useEffect, useRef, useState } from "react";
import "./FlyToQueue.css";

/**
 * Renders a ghost element that flies from sourceRect to targetRect
 * along a curved arc path with rotation, then self-destructs.
 */
export default function FlyToQueue({ sourceRect, targetRect, songName, onComplete }) {
  const [active, setActive] = useState(true);
  const elRef = useRef(null);

  useEffect(() => {
    if (!sourceRect || !targetRect) {
      onComplete?.();
      return;
    }

    const el = elRef.current;
    if (!el) return;

    // Set initial position
    el.style.left = `${sourceRect.left}px`;
    el.style.top = `${sourceRect.top}px`;
    el.style.width = `${sourceRect.width}px`;
    el.style.height = `${sourceRect.height}px`;

    // Calculate deltas
    const dx = targetRect.left + targetRect.width / 2 - (sourceRect.left + sourceRect.width / 2);
    const dy = targetRect.top + targetRect.height / 2 - (sourceRect.top + sourceRect.height / 2);

    // Apply CSS variables for the animation
    el.style.setProperty('--fly-dx', `${dx}px`);
    el.style.setProperty('--fly-dy', `${dy}px`);

    // Trigger animation via class
    requestAnimationFrame(() => {
      el.classList.add('flying');
    });

    const timer = setTimeout(() => {
      setActive(false);
      onComplete?.();
    }, 480);

    return () => clearTimeout(timer);
  }, [sourceRect, targetRect]);

  if (!active || !sourceRect) return null;

  return (
    <div className="fly-to-queue-ghost" ref={elRef}>
      <div className="fly-ghost-content">
        <span className="fly-ghost-text">{songName}</span>
      </div>
    </div>
  );
}
