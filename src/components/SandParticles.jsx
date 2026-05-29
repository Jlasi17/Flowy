import { useEffect, useRef } from 'react';

/**
 * SandParticles — gravity-based particle accumulation system.
 *
 * Particles rain from the top, obey a simple gravity + friction simulation,
 * land permanently on the floor (or on a settled particle), and accumulate
 * into dense glowing sand dunes whose colour progresses from dim settled
 * white/purple through bright pink/red layers as more particles stack.
 */
export default function SandParticles({ progress = 0 }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    falling: [],       // active airborne particles
    settled: [],       // grid of settled cells  { x, y, age, color }
    grid: null,        // 2D occupancy grid [col][row] → true/false
    cols: 0,
    rows: 0,
    cellSize: 5,
    frame: 0,
    animId: null,
    progress: 0,
  });

  // ── colour palette – bottom layers glow fiery, upper layers cool purple ──
  const getColor = (stackDepth, maxStack) => {
    // 0 = freshly settled (top of pile), maxStack = buried deep
    const t = stackDepth / Math.max(maxStack, 1);
    if (t < 0.25) {
      // top: glowing white-pink
      return `rgba(255, 200, 255, ${0.55 + t * 1.6})`;
    } else if (t < 0.5) {
      // mid-top: vivid magenta / hot pink
      const a = 0.85 + (t - 0.25) * 0.6;
      return `rgba(255, 60, 160, ${Math.min(a, 1)})`;
    } else if (t < 0.75) {
      // mid-bottom: fierce red-orange
      const a = 0.88 + (t - 0.5) * 0.48;
      return `rgba(255, 80, 40, ${Math.min(a, 1)})`;
    } else {
      // deepest: ember dark red with a slight golden core
      return `rgba(200, 30, 10, ${0.7 + (t - 0.75) * 1.2})`;
    }
  };

  // ── glow colour for shadow rendering ──
  const getGlow = (stackDepth, maxStack) => {
    const t = stackDepth / Math.max(maxStack, 1);
    if (t < 0.4) return 'rgba(255, 80, 200, 0.65)';
    if (t < 0.7) return 'rgba(255, 60, 80, 0.55)';
    return 'rgba(255, 80, 10, 0.45)';
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const C = s.cellSize;
      s.cols = Math.floor(canvas.width / C);
      s.rows = Math.floor(canvas.height / C);
      // rebuild occupancy grid
      s.grid = Array.from({ length: s.cols }, () => new Uint8Array(s.rows));
      // re-settle existing particles so they don't float
      s.settled = [];
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // ── spawn one particle ──
    const spawnParticle = () => {
      const C = s.cellSize;
      const col = Math.floor(Math.random() * s.cols);
      s.falling.push({
        x: col * C + C / 2,
        y: -C,
        vx: (Math.random() - 0.5) * 1.2,
        vy: 0.8 + Math.random() * 1.6,
        col,
        row: -1,
        size: C * (0.7 + Math.random() * 0.4),
        alpha: 0.6 + Math.random() * 0.4,
      });
    };

    // ── settle a particle at the lowest free row in its column ──
    const settle = (p) => {
      const C = s.cellSize;
      let targetRow = s.rows - 1;
      // scan from bottom up to find first free row
      while (targetRow >= 0 && s.grid[p.col][targetRow]) {
        targetRow--;
      }
      if (targetRow < 0) return; // column completely full – discard
      s.grid[p.col][targetRow] = 1;
      s.settled.push({ col: p.col, row: targetRow, age: 0 });
    };

    // ── draw a single settled cell ──
    const drawSettled = (cell, maxAge) => {
      const C = s.cellSize;
      const x = cell.col * C;
      const y = cell.row * C;
      // compute how deep this cell is in its column stack
      let stackDepth = 0;
      for (let r = cell.row + 1; r < s.rows; r++) {
        if (s.grid[cell.col][r]) stackDepth++;
      }
      const maxStack = Math.min(s.rows, 80);
      const color = getColor(stackDepth, maxStack);
      const glow = getGlow(stackDepth, maxStack);

      ctx.shadowColor = glow;
      ctx.shadowBlur = stackDepth > 3 ? 8 : 4;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, C - 0.5, C - 0.5);
    };

    // ── main loop ──
    const loop = () => {
      s.animId = requestAnimationFrame(loop);
      s.frame++;
      const C = s.cellSize;
      const prog = s.progress; // 0-100

      // spawn rate scales with progress (more particles as it advances)
      const spawnChance = 0.25 + (prog / 100) * 0.55;
      if (Math.random() < spawnChance) spawnParticle();

      // ── clear ──
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.shadowBlur = 0;

      // ── draw settled sand ──
      for (const cell of s.settled) {
        drawSettled(cell, s.frame);
        cell.age++;
      }

      // ── update & draw falling particles ──
      ctx.shadowBlur = 0;
      const toRemove = [];
      for (let i = 0; i < s.falling.length; i++) {
        const p = s.falling[i];

        // gravity
        p.vy += 0.18;
        // slight air resistance
        p.vx *= 0.99;

        p.x += p.vx;
        p.y += p.vy;

        // column follows x (can drift slightly column to column)
        const newCol = Math.max(0, Math.min(s.cols - 1, Math.floor(p.x / C)));
        p.col = newCol;

        // check if hit floor or a settled cell
        const curRow = Math.floor(p.y / C);
        let landed = false;
        if (curRow >= s.rows) {
          landed = true;
        } else if (curRow >= 0 && s.grid[p.col][curRow]) {
          landed = true;
          p.y = curRow * C; // snap to top of settled
        }

        if (landed) {
          settle(p);
          toRemove.push(i);
          continue;
        }

        // draw airborne particle
        ctx.save();
        ctx.shadowColor = 'rgba(255, 120, 200, 0.6)';
        ctx.shadowBlur = 6;
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = 'rgba(255, 200, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      // remove settled (reverse order so indices stay valid)
      for (let i = toRemove.length - 1; i >= 0; i--) {
        s.falling.splice(toRemove[i], 1);
      }
    };

    s.animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(s.animId);
      ro.disconnect();
    };
  }, []);

  // sync external progress into the ref so the loop can see it
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
