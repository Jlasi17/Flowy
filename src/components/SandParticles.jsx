import { useEffect, useRef } from 'react';

/**
 * SandParticles — Premium cinematic granular sand simulation.
 *
 * True physics: Gaussian-spread landing, angle-of-repose avalanching,
 * lerped heightmap, multi-pass dune rendering with bloom/glow, and
 * multi-sized particles with trails and dynamic colour palette.
 */
export default function SandParticles({ progress = 0 }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    falling: [],
    targetH: null,
    displayH: null,
    cols: 0,
    frame: 0,
    animId: null,
    progress: 0,
    w: 0,
    h: 0,
    time: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    const s = stateRef.current;

    // ── Resize with HiDPI support ──
    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      s.w = w;
      s.h = h;
      // Fine columns: 1 per ~3px for ultra-smooth surface
      s.cols = Math.ceil(w / 3);
      s.targetH = new Float32Array(s.cols);
      s.displayH = new Float32Array(s.cols);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // ── Cinematic colour palette ──
    const PALETTE = [
      [255, 180, 220], // soft pink
      [255, 130, 100], // warm coral
      [255, 170,  60], // peach-orange
      [220,  55, 180], // magenta
      [170, 120, 255], // lavender
      [220,  25,  55], // ember red
      [255, 215,  90], // gold
      [255, 110, 160], // hot pink (loop back)
    ];

    const lerpRGB = (a, b, t) => [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t,
    ];

    // Returns `rgba(r,g,b` (no closing paren) so caller appends `, alpha)`
    const paletteColor = (t) => {
      const idx = (((t % 1) + 1) % 1) * (PALETTE.length - 1);
      const i = Math.floor(idx);
      const f = idx - i;
      const [r, g, b] = lerpRGB(PALETTE[i], PALETTE[(i + 1) % PALETTE.length], f);
      return `rgba(${r | 0},${g | 0},${b | 0}`;
    };

    const particleColor = (x, t) =>
      paletteColor(x / Math.max(s.w, 1) * 0.7 + t * 0.00025);

    // ── Spawn one falling particle ──
    const spawn = () => {
      const x = Math.random() * s.w;
      const tier = Math.random();
      // Three size classes: tiny (far), medium, large (foreground)
      const r =
        tier < 0.55 ? 0.8 + Math.random() * 0.7 :
        tier < 0.85 ? 1.8 + Math.random() * 1.2 :
                      3.0 + Math.random() * 1.8;
      s.falling.push({
        x,
        y: -r * 3,
        vx: (Math.random() - 0.5) * 1.0,
        vy: 0.4 + Math.random() * 1.4 + (1 - tier) * 0.5,
        r,
        baseAlpha: 0.65 + Math.random() * 0.35,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleAmp: 0.15 + Math.random() * 0.35,
        wobbleFreq: 0.025 + Math.random() * 0.04,
        trail: [],
      });
    };

    // ── Build a smooth Catmull-Rom bezier path through heightmap ──
    // Returns nothing; leaves canvas path open for fill/stroke.
    const buildSurfacePath = (H, colW, w, h, closed) => {
      const n = H.length;
      ctx.beginPath();
      if (closed) ctx.moveTo(0, h);

      // First point
      const x0 = colW * 0.5;
      const y0 = h - H[0];
      if (closed) ctx.lineTo(x0, y0);
      else ctx.moveTo(x0, y0);

      for (let i = 0; i < n - 1; i++) {
        const im1 = Math.max(0, i - 1);
        const ip1 = i + 1;
        const ip2 = Math.min(n - 1, i + 2);

        const p0x = im1 * colW + colW * 0.5, p0y = h - H[im1];
        const p1x = i   * colW + colW * 0.5, p1y = h - H[i];
        const p2x = ip1 * colW + colW * 0.5, p2y = h - H[ip1];
        const p3x = ip2 * colW + colW * 0.5, p3y = h - H[ip2];

        // Catmull-Rom → cubic bezier (tension = 1/6)
        const cp1x = p1x + (p2x - p0x) / 6;
        const cp1y = p1y + (p2y - p0y) / 6;
        const cp2x = p2x - (p3x - p1x) / 6;
        const cp2y = p2y - (p3y - p1y) / 6;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2x, p2y);
      }

      if (closed) {
        ctx.lineTo(w, h);
        ctx.closePath();
      }
    };

    // ── safe max over typed array ──
    const typedMax = (arr) => {
      let m = 0;
      for (let i = 0; i < arr.length; i++) if (arr[i] > m) m = arr[i];
      return m;
    };

    // ── Draw the full sand dune ──
    const drawDune = (time) => {
      const { w, h, cols, displayH } = s;
      const colW = w / cols;
      const maxH = typedMax(displayH);
      if (maxH < 0.5) return;

      const top = h - maxH;

      // === PASS 1: Bloom pre-glow (blurred fill) ===
      ctx.save();
      ctx.filter = 'blur(12px)';
      buildSurfacePath(displayH, colW, w, h, true);
      const gBloom = ctx.createLinearGradient(0, top - 30, 0, h);
      gBloom.addColorStop(0,   'rgba(255, 160, 220, 0.28)');
      gBloom.addColorStop(0.3, 'rgba(200, 40, 100, 0.20)');
      gBloom.addColorStop(1,   'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gBloom;
      ctx.fill();
      ctx.filter = 'none';
      ctx.restore();

      // === PASS 2: Main body — vertical gradient (depth layers) ===
      buildSurfacePath(displayH, colW, w, h, true);
      const gMain = ctx.createLinearGradient(0, top - 20, 0, h);
      gMain.addColorStop(0.00, 'rgba(255, 225, 255, 0.45)'); // shimmering surface
      gMain.addColorStop(0.06, 'rgba(255, 155, 205, 0.82)'); // pink top
      gMain.addColorStop(0.20, 'rgba(215, 50, 145, 0.88)');  // magenta mid
      gMain.addColorStop(0.42, 'rgba(170, 20, 75, 0.93)');   // deep crimson
      gMain.addColorStop(0.70, 'rgba(100, 5, 25, 0.97)');    // dark ember
      gMain.addColorStop(1.00, 'rgba(35, 0, 8, 1.00)');      // black-red base
      ctx.fillStyle = gMain;
      ctx.fill();

      // === PASS 3: Horizontal colour sweep (left→right palette) ===
      buildSurfacePath(displayH, colW, w, h, true);
      const gHoriz = ctx.createLinearGradient(0, 0, w, 0);
      gHoriz.addColorStop(0.00, 'rgba(255, 100, 180, 0.13)');
      gHoriz.addColorStop(0.20, 'rgba(255, 155, 60,  0.10)');
      gHoriz.addColorStop(0.45, 'rgba(165, 75, 255,  0.14)');
      gHoriz.addColorStop(0.70, 'rgba(255, 75, 110,  0.11)');
      gHoriz.addColorStop(1.00, 'rgba(255, 200, 90,  0.12)');
      ctx.fillStyle = gHoriz;
      ctx.globalCompositeOperation = 'screen';
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';

      // === PASS 4: Animated shimmer band ===
      buildSurfacePath(displayH, colW, w, h, true);
      const sx = ((time * 0.00035) % 1) * (w + w * 0.5) - w * 0.25;
      const gShimmer = ctx.createLinearGradient(sx, 0, sx + w * 0.45, 0);
      gShimmer.addColorStop(0,   'rgba(255, 245, 255, 0)');
      gShimmer.addColorStop(0.5, 'rgba(255, 245, 255, 0.065)');
      gShimmer.addColorStop(1,   'rgba(255, 245, 255, 0)');
      ctx.fillStyle = gShimmer;
      ctx.fill();

      // === PASS 5: Surface highlight stroke with glow ===
      ctx.save();
      buildSurfacePath(displayH, colW, w, h, false);
      ctx.shadowColor = 'rgba(255, 200, 255, 0.9)';
      ctx.shadowBlur = 16;
      ctx.strokeStyle = 'rgba(255, 235, 255, 0.65)';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Second, softer stroke for wider bloom
      ctx.shadowBlur = 35;
      ctx.shadowColor = 'rgba(220, 100, 200, 0.55)';
      ctx.strokeStyle = 'rgba(255, 200, 240, 0.25)';
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.restore();

      // === PASS 6: Ambient inner lighting — radial center warmth ===
      buildSurfacePath(displayH, colW, w, h, true);
      const cx = w * 0.5, cy = h - maxH * 0.45;
      const gRadial = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.6);
      gRadial.addColorStop(0,   'rgba(255, 150, 100, 0.08)');
      gRadial.addColorStop(0.5, 'rgba(200, 50, 120, 0.04)');
      gRadial.addColorStop(1,   'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gRadial;
      ctx.fill();
    };

    // ── Main animation loop ──
    const loop = () => {
      s.animId = requestAnimationFrame(loop);
      s.frame++;
      s.time += 16;
      const { w, h, cols, targetH, displayH } = s;
      const colW = w / cols;
      const prog = s.progress;
      const t = s.time;

      // Spawn rate ramps up with progress
      const baseRate = 0.30 + (prog / 100) * 0.65;
      if (Math.random() < baseRate) spawn();
      if (prog > 50 && Math.random() < 0.25) spawn();
      if (prog > 80 && Math.random() < 0.20) spawn();

      ctx.clearRect(0, 0, w, h);

      // ── Update & draw falling particles ──
      const toRemove = [];
      for (let i = 0; i < s.falling.length; i++) {
        const p = s.falling[i];

        // Wobble / wind turbulence
        p.wobblePhase += p.wobbleFreq;
        const wind = Math.sin(p.wobblePhase + t * 0.0009) * p.wobbleAmp;
        p.vx += wind * 0.06;
        p.vx *= 0.975;   // lateral drag
        p.vy += 0.26;    // gravity
        p.vy  = Math.min(p.vy, 9); // terminal velocity

        p.x += p.vx;
        p.y += p.vy;

        // Bounce off walls
        if (p.x < p.r)     { p.x = p.r;     p.vx =  Math.abs(p.vx) * 0.4; }
        if (p.x > w - p.r) { p.x = w - p.r; p.vx = -Math.abs(p.vx) * 0.4; }

        // Land detection
        const col = Math.max(0, Math.min(cols - 1, Math.floor(p.x / colW)));
        const sandTopY = h - targetH[col];

        if (p.y + p.r >= sandTopY) {
          // Gaussian spread on landing — natural soft pile-up
          const addH = (2.2 + p.r * 0.7) * (0.85 + Math.random() * 0.3);
          const sigma = 2.5 + p.r * 0.9;
          const reach = Math.ceil(sigma * 3.5);
          for (let dc = -reach; dc <= reach; dc++) {
            const tc = col + dc;
            if (tc < 0 || tc >= cols) continue;
            const w2 = Math.exp(-(dc * dc) / (2 * sigma * sigma));
            targetH[tc] = Math.min(h * 0.87, targetH[tc] + addH * w2);
          }
          toRemove.push(i);
          continue;
        }

        // ── Draw falling particle ──
        const distToSand = sandTopY - p.y;
        const fadeFactor = Math.min(1, distToSand / 90);
        if (fadeFactor <= 0.01) continue;

        const alpha = p.baseAlpha * fadeFactor;
        const col_str = particleColor(p.x, t);

        // Trail
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 6) p.trail.shift();

        ctx.save();
        for (let ti = 0; ti < p.trail.length - 1; ti++) {
          const tr = p.trail[ti];
          const tAlpha = alpha * 0.28 * ((ti + 1) / p.trail.length);
          ctx.globalAlpha = tAlpha;
          ctx.fillStyle = `${col_str}, 1)`;
          ctx.beginPath();
          ctx.arc(tr.x, tr.y, p.r * 0.55, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // Outer glow
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowColor = `${col_str}, 0.85)`;
        ctx.shadowBlur = p.r * 7;
        ctx.fillStyle = `${col_str}, 1)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        // Bright inner core
        ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(255, 248, 255, ${alpha * 0.75})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 0.42, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Remove settled particles (reverse for index safety)
      for (let i = toRemove.length - 1; i >= 0; i--) {
        s.falling.splice(toRemove[i], 1);
      }

      // ── Angle-of-repose avalanche (multi-pass) ──
      // Mimics natural sand slope — runs 3 passes L→R then R→L
      const angleOfRepose = 1.6; // max height diff per column before flow
      const flowRate = 0.28;
      for (let pass = 0; pass < 3; pass++) {
        for (let c = 1; c < cols; c++) {
          const d = targetH[c - 1] - targetH[c];
          if (d > angleOfRepose) {
            const f = (d - angleOfRepose) * flowRate;
            targetH[c - 1] -= f;
            targetH[c]     += f;
          }
        }
        for (let c = cols - 2; c >= 0; c--) {
          const d = targetH[c + 1] - targetH[c];
          if (d > angleOfRepose) {
            const f = (d - angleOfRepose) * flowRate;
            targetH[c + 1] -= f;
            targetH[c]     += f;
          }
        }
      }

      // ── Lerp display heights → buttery smooth surface ──
      for (let c = 0; c < cols; c++) {
        displayH[c] += (targetH[c] - displayH[c]) * 0.09;
      }

      // ── Draw dune ──
      drawDune(t);
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
