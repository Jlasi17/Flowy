import { useEffect, useRef } from 'react';

/**
 * SandParticles — True cellular automata granular sand simulation.
 *
 * Every grain is an individual cell. Rules per tick:
 *   1. Fall straight down if empty below
 *   2. Roll diagonally left or right
 *   3. Otherwise settle in place
 *
 * This produces organic dune formation, natural slopes, and realistic
 * avalanche collapse — no fake heightmap interpolation.
 */

const CELL = 3; // px per grid cell

// Cinematic colour palette
const PALETTE = [
  [255, 180, 220], // soft pink
  [255, 130, 100], // warm coral
  [255, 170,  60], // peach orange
  [220,  55, 180], // magenta
  [170, 120, 255], // lavender
  [220,  25,  55], // ember red
  [255, 215,  90], // gold
];

function samplePalette(t) {
  const s = (((t % 1) + 1) % 1) * (PALETTE.length - 1);
  const i = s | 0;
  const f = s - i;
  const a = PALETTE[i], b = PALETTE[(i + 1) % PALETTE.length];
  return [
    (a[0] + (b[0] - a[0]) * f) | 0,
    (a[1] + (b[1] - a[1]) * f) | 0,
    (a[2] + (b[2] - a[2]) * f) | 0,
  ];
}

export default function SandParticles({ progress = 0 }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    grid: null,       // Uint8Array — 0 = empty, 1 = sand
    r: null,          // Uint8Array — per-cell R
    g: null,          // Uint8Array — per-cell G
    b: null,          // Uint8Array — per-cell B
    cols: 0,
    rows: 0,
    sparkles: [],     // airborne falling particles
    frame: 0,
    animId: null,
    progress: 0,
    w: 0,
    h: 0,
    time: 0,
    offCanvas: null,
    offCtx: null,
    imgData: null,
    buf32: null,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;

    // ── Offscreen canvas for fast pixel rendering ──
    const offCanvas = document.createElement('canvas');
    const offCtx = offCanvas.getContext('2d');
    s.offCanvas = offCanvas;
    s.offCtx = offCtx;

    const resize = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      canvas.width = w;
      canvas.height = h;
      s.w = w;
      s.h = h;
      s.cols = Math.ceil(w / CELL);
      s.rows = Math.ceil(h / CELL);
      offCanvas.width  = s.cols;
      offCanvas.height = s.rows;
      const n = s.cols * s.rows;
      s.grid = new Uint8Array(n);
      s.r    = new Uint8Array(n);
      s.g    = new Uint8Array(n);
      s.b    = new Uint8Array(n);
      s.imgData = offCtx.createImageData(s.cols, s.rows);
      s.buf32   = new Uint32Array(s.imgData.data.buffer);
      s.sparkles = [];
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // ── Helpers ──
    const idx = (c, r) => r * s.cols + c;
    const inBounds = (c, r) => c >= 0 && c < s.cols && r >= 0 && r < s.rows;
    const isEmpty  = (c, r) => inBounds(c, r) && s.grid[idx(c, r)] === 0;

    const swapCells = (c1, r1, c2, r2) => {
      const i1 = idx(c1, r1), i2 = idx(c2, r2);
      let tmp;
      tmp = s.grid[i1]; s.grid[i1] = s.grid[i2]; s.grid[i2] = tmp;
      tmp = s.r[i1];    s.r[i1]    = s.r[i2];    s.r[i2]    = tmp;
      tmp = s.g[i1];    s.g[i1]    = s.g[i2];    s.g[i2]    = tmp;
      tmp = s.b[i1];    s.b[i1]    = s.b[i2];    s.b[i2]    = tmp;
    };

    const placeGrain = (col, row, cr, cg, cb) => {
      if (!inBounds(col, row) || s.grid[idx(col, row)]) return false;
      const i = idx(col, row);
      s.grid[i] = 1;
      s.r[i] = cr;
      s.g[i] = cg;
      s.b[i] = cb;
      return true;
    };

    // ── Spawn a falling sparkle ──
    const spawnSparkle = () => {
      const x = Math.random() * s.w;
      const tier = Math.random();
      const radius = tier < 0.55 ? 1.0 + Math.random() * 0.8
                   : tier < 0.85 ? 1.8 + Math.random() * 1.2
                   :               3.0 + Math.random() * 1.5;
      // Colour from palette, vary by x position
      const t = (x / s.w) * 0.8 + (s.time * 0.00022) % 1;
      const [cr, cg, cb] = samplePalette(t + (Math.random() - 0.5) * 0.15);
      s.sparkles.push({
        x,
        y: -radius * 2,
        vx: (Math.random() - 0.5) * 1.2,
        vy: 1.0 + Math.random() * 2.0,
        r: radius,
        cr, cg, cb,
        alpha: 0.7 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2,
      });
    };

    // ── CA update — the heart of the simulation ──
    const updateCA = () => {
      const { cols, rows } = s;
      // Alternate scan direction each frame to avoid directional bias
      const leftFirst = (s.frame & 1) === 0;

      // Scan bottom → top so falling grains don't move twice per tick
      for (let row = rows - 2; row >= 0; row--) {
        for (let ci = 0; ci < cols; ci++) {
          const col = leftFirst ? ci : cols - 1 - ci;
          const i = idx(col, row);
          if (!s.grid[i]) continue;

          // Rule 1: fall straight down
          if (isEmpty(col, row + 1)) {
            swapCells(col, row, col, row + 1);
            continue;
          }

          // Rule 2: roll to diagonal (random preference to avoid drift)
          const dl = (Math.random() < 0.5) ? -1 : 1;
          const dr = -dl;
          if (isEmpty(col + dl, row + 1)) {
            swapCells(col, row, col + dl, row + 1);
          } else if (isEmpty(col + dr, row + 1)) {
            swapCells(col, row, col + dr, row + 1);
          }
          // else: settled — no move
        }
      }
    };

    // ── Find surface row per column (topmost occupied row) ──
    const getSurface = (col) => {
      const { rows, cols } = s;
      for (let r = 0; r < rows; r++) {
        if (s.grid[r * cols + col]) return r;
      }
      return rows;
    };

    // ── Draw smooth surface highlight spline ──
    const drawSurfaceGlow = () => {
      const { cols, w, h } = s;
      const pts = [];
      for (let c = 0; c < cols; c++) {
        const sr = getSurface(c);
        if (sr < s.rows) {
          pts.push({ x: c * CELL + CELL / 2, y: sr * CELL });
        }
      }
      if (pts.length < 4) return;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[Math.min(pts.length - 1, i + 2)];
        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
      }
      ctx.shadowColor = 'rgba(255, 200, 255, 0.9)';
      ctx.shadowBlur = 14;
      ctx.strokeStyle = 'rgba(255, 230, 255, 0.55)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Second wide soft bloom pass
      ctx.shadowBlur = 30;
      ctx.shadowColor = 'rgba(200, 80, 200, 0.45)';
      ctx.strokeStyle = 'rgba(255, 210, 255, 0.18)';
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.restore();
    };

    // ── Render CA grid via ImageData (fast pixel write) ──
    const renderGrid = () => {
      const { cols, rows, grid, r: R, g: G, b: B, buf32 } = s;
      for (let i = 0; i < cols * rows; i++) {
        if (!grid[i]) {
          buf32[i] = 0;
          continue;
        }
        // Depth darkening: cells near bottom are warmer/darker
        const row = (i / cols) | 0;
        const depth = row / rows; // 0=top, 1=bottom
        const df = 1 - depth * 0.55;
        const br = (R[i] * df) | 0;
        const bg = (G[i] * df) | 0;
        const bb = (B[i] * df) | 0;
        // ABGR little-endian
        buf32[i] = (255 << 24) | (bb << 16) | (bg << 8) | br;
      }
      s.offCtx.putImageData(s.imgData, 0, 0);
    };

    // ── Main loop ──
    const loop = () => {
      s.animId = requestAnimationFrame(loop);
      s.frame++;
      s.time += 16;
      const { w, h, cols, rows } = s;
      const prog = s.progress;

      // Spawn sparkles — rate scales with progress
      const rate = 0.28 + (prog / 100) * 0.68;
      if (Math.random() < rate) spawnSparkle();
      if (prog > 55 && Math.random() < 0.28) spawnSparkle();
      if (prog > 80 && Math.random() < 0.22) spawnSparkle();

      // Run CA physics
      updateCA();

      // ── Update sparkles & deposit into grid ──
      ctx.clearRect(0, 0, w, h);
      const toRemove = [];

      for (let i = 0; i < s.sparkles.length; i++) {
        const p = s.sparkles[i];

        // Gentle wobble + gravity
        p.phase += 0.035 + Math.random() * 0.01;
        p.vx += Math.sin(p.phase) * 0.08;
        p.vx *= 0.975;
        p.vy += 0.27;
        p.vy  = Math.min(p.vy, 10);
        p.x  += p.vx;
        p.y  += p.vy;

        // Wall bounce
        if (p.x < p.r)     { p.x = p.r;     p.vx =  Math.abs(p.vx) * 0.4; }
        if (p.x > w - p.r) { p.x = w - p.r; p.vx = -Math.abs(p.vx) * 0.4; }

        // Grid position
        const gc = Math.max(0, Math.min(cols - 1, (p.x / CELL) | 0));
        const gr = Math.max(0, Math.min(rows - 1, (p.y / CELL) | 0));

        // Check landing: hit floor or hit settled grain
        const hitFloor = gr >= rows - 1;
        const hitGrain  = s.grid[idx(gc, gr)] === 1;

        if (hitFloor || hitGrain) {
          // Find first empty cell at or above landing point
          for (let dr = 0; dr >= -3; dr--) {
            const tr = gr + dr;
            if (tr < 0) break;
            if (placeGrain(gc, tr, p.cr, p.cg, p.cb)) break;
          }
          toRemove.push(i);
          continue;
        }

        // Draw sparkle (on top of grid)
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.shadowColor = `rgba(${p.cr},${p.cg},${p.cb},0.85)`;
        ctx.shadowBlur   = p.r * 8;
        ctx.fillStyle    = `rgba(${p.cr},${p.cg},${p.cb},1)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        // Bright inner core
        ctx.shadowBlur = 0;
        ctx.fillStyle  = 'rgba(255,248,255,0.8)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 0.38, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      for (let i = toRemove.length - 1; i >= 0; i--) {
        s.sparkles.splice(toRemove[i], 1);
      }

      // ── Render CA grid ──
      renderGrid();

      // Pass 1: base grid scaled up with smoothing
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.filter = 'blur(0.8px)';
      ctx.drawImage(s.offCanvas, 0, 0, w, h);
      ctx.filter = 'none';
      ctx.restore();

      // Pass 2: bloom — blurred screen-mode overlay
      ctx.save();
      ctx.filter = 'blur(5px)';
      ctx.globalAlpha = 0.38;
      ctx.globalCompositeOperation = 'screen';
      ctx.drawImage(s.offCanvas, 0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.filter = 'none';
      ctx.restore();

      // Pass 3: surface highlight glow spline
      drawSurfaceGlow();
    };

    s.animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(s.animId);
      ro.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
