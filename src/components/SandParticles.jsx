import { useEffect, useRef } from 'react';

/**
 * SandParticles — gravity-based particle accumulation system.
 *
 * Particles fall from the top as glowing sparkles, settle permanently,
 * and build up a SMOOTH sand dune silhouette rendered as a filled Bezier
 * curve path with a layered gradient — just like real sand.
 */
export default function SandParticles({ progress = 0 }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    falling: [],      // airborne particles
    colHeights: [],   // settled sand height per column (in px from bottom)
    displayHeights: [],// smoothly interpolated heights for rendering
    cols: 60,         // how many virtual columns
    frame: 0,
    animId: null,
    progress: 0,
    w: 0,
    h: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;

    // ── resize ──
    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      s.w = canvas.offsetWidth;
      s.h = canvas.offsetHeight;
      s.cols = Math.max(60, Math.floor(s.w / 8));
      if (s.colHeights.length !== s.cols) {
        s.colHeights = new Float32Array(s.cols);
        s.displayHeights = new Float32Array(s.cols);
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // ── spawn one falling sparkle ──
    const spawnParticle = () => {
      const x = Math.random() * s.w;
      s.falling.push({
        x,
        y: -8,
        vx: (Math.random() - 0.5) * 1.5,
        vy: 1.2 + Math.random() * 2.0,
        r: 1.5 + Math.random() * 2,
        alpha: 0.7 + Math.random() * 0.3,
      });
    };

    // ── build a smooth path across all column heights ──
    // Uses cardinal spline (Catmull-Rom feel) via bezier approximation
    const buildSandPath = (heights, w, h, cols) => {
      const colW = w / cols;
      const pts = [];
      for (let c = 0; c < cols; c++) {
        pts.push({ x: c * colW + colW / 2, y: h - heights[c] });
      }

      ctx.beginPath();
      ctx.moveTo(0, h); // bottom-left corner

      // smooth curve through pts using bezier control points
      if (pts.length < 2) {
        ctx.lineTo(w, h);
      } else {
        ctx.lineTo(pts[0].x, pts[0].y);
        for (let i = 0; i < pts.length - 1; i++) {
          const p0 = pts[Math.max(i - 1, 0)];
          const p1 = pts[i];
          const p2 = pts[i + 1];
          const p3 = pts[Math.min(i + 2, pts.length - 1)];
          // Catmull-Rom → bezier tension 0.5
          const cp1x = p1.x + (p2.x - p0.x) / 6;
          const cp1y = p1.y + (p2.y - p0.y) / 6;
          const cp2x = p2.x - (p3.x - p1.x) / 6;
          const cp2y = p2.y - (p3.y - p1.y) / 6;
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
        }
      }

      ctx.lineTo(w, h); // bottom-right corner
      ctx.closePath();
    };

    // ── draw the filled smooth sand dune ──
    const drawSand = () => {
      const { w, h, cols, displayHeights } = s;
      const maxH = Math.max(...displayHeights, 1);

      // 1. Base fill — deep gradient
      buildSandPath(displayHeights, w, h, cols);
      const grad = ctx.createLinearGradient(0, h - maxH, 0, h);
      grad.addColorStop(0.0,  'rgba(255, 220, 255, 0.55)'); // surface glimmer
      grad.addColorStop(0.15, 'rgba(255, 100, 200, 0.75)'); // hot pink
      grad.addColorStop(0.45, 'rgba(220, 30, 100, 0.85)');  // deep magenta
      grad.addColorStop(0.75, 'rgba(160, 10, 40, 0.92)');   // dark red
      grad.addColorStop(1.0,  'rgba(80, 0, 20, 1.0)');      // ember black-red
      ctx.fillStyle = grad;
      ctx.fill();

      // 2. Surface glow — thin bright line along the top edge
      buildSandPath(displayHeights, w, h, cols);
      ctx.save();
      ctx.shadowColor = 'rgba(255, 120, 220, 0.8)';
      ctx.shadowBlur = 18;
      ctx.strokeStyle = 'rgba(255, 200, 255, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // 3. Secondary inner glow layer
      buildSandPath(displayHeights, w, h, cols);
      ctx.save();
      ctx.shadowColor = 'rgba(255, 50, 150, 0.5)';
      ctx.shadowBlur = 30;
      const innerGrad = ctx.createLinearGradient(0, h - maxH, 0, h);
      innerGrad.addColorStop(0,   'rgba(255, 150, 220, 0.25)');
      innerGrad.addColorStop(0.5, 'rgba(200, 20, 80, 0.15)');
      innerGrad.addColorStop(1,   'rgba(0, 0, 0, 0)');
      ctx.fillStyle = innerGrad;
      ctx.fill();
      ctx.restore();
    };

    // ── main loop ──
    const loop = () => {
      s.animId = requestAnimationFrame(loop);
      s.frame++;
      const { w, h, cols } = s;
      const prog = s.progress;
      const colW = w / cols;

      // spawn rate
      const spawnChance = 0.3 + (prog / 100) * 0.65;
      if (Math.random() < spawnChance) spawnParticle();

      ctx.clearRect(0, 0, w, h);

      // ── update falling particles ──
      const toRemove = [];
      for (let i = 0; i < s.falling.length; i++) {
        const p = s.falling[i];
        p.vy += 0.22;    // gravity
        p.vx *= 0.98;    // drag
        p.x += p.vx;
        p.y += p.vy;

        // which column?
        const col = Math.max(0, Math.min(cols - 1, Math.floor(p.x / colW)));
        const sandTopY = h - s.colHeights[col];

        if (p.y >= sandTopY) {
          // landed — add to column height (spread a little to neighbours)
          const addH = 1.8 + Math.random() * 1.2;
          s.colHeights[col] = Math.min(h * 0.85, s.colHeights[col] + addH);
          // slight spillover to adjacent columns for natural slope
          if (col > 0)      s.colHeights[col-1] = Math.min(h * 0.85, s.colHeights[col-1] + addH * 0.25);
          if (col < cols-1) s.colHeights[col+1] = Math.min(h * 0.85, s.colHeights[col+1] + addH * 0.25);
          toRemove.push(i);
          continue;
        }

        // draw sparkle
        ctx.save();
        ctx.globalAlpha = p.alpha * Math.min(1, (sandTopY - p.y) / 60);
        ctx.shadowColor = 'rgba(255, 180, 240, 0.9)';
        ctx.shadowBlur = 10;
        ctx.fillStyle = 'rgba(255, 230, 255, 0.95)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // remove settled particles (reverse so indices stay valid)
      for (let i = toRemove.length - 1; i >= 0; i--) {
        s.falling.splice(toRemove[i], 1);
      }

      // ── easing: slowly level very steep adjacent columns (avalanche) ──
      if (s.frame % 3 === 0) {
        for (let c = 1; c < cols - 1; c++) {
          const diff = s.colHeights[c] - s.colHeights[c - 1];
          if (Math.abs(diff) > 6) {
            const flow = diff * 0.04;
            s.colHeights[c] -= flow;
            s.colHeights[c - 1] += flow;
          }
        }
      }

      // ── lerp display heights towards real heights for buttery smoothness ──
      for (let c = 0; c < cols; c++) {
        s.displayHeights[c] += (s.colHeights[c] - s.displayHeights[c]) * 0.12;
      }

      // ── draw smooth sand dune ──
      drawSand();
    };

    s.animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(s.animId);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    stateRef.current.progress = progress;
  }, [progress]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
