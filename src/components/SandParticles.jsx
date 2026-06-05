/* eslint-disable */
import { useEffect, useRef } from 'react';
import Matter from 'matter-js';

const PALETTE = [
  [255, 180, 220],
  [255, 130, 100],
  [255, 170, 60],
  [220, 55, 180],
  [170, 120, 255],
  [220, 25, 55],
  [255, 215, 90],
];

function samplePalette(t) {
  const n = PALETTE.length;
  const s = (((t % 1) + 1) % 1) * (n - 1);
  const i = s | 0;
  const f = s - i;
  const a = PALETTE[i], b = PALETTE[(i + 1) % n];
  return [
    (a[0] + (b[0] - a[0]) * f) | 0,
    (a[1] + (b[1] - a[1]) * f) | 0,
    (a[2] + (b[2] - a[2]) * f) | 0,
  ];
}

const BASE_RADIUS = 4;
const MAX_BODIES = 3000; // Allow enough bodies so it runs for the entire song
const BLOOM_EVERY = 3;   // bloom pass only every N frames

export default function SandParticles({ progress = 0 }) {
  const containerRef = useRef(null);
  const progressRef = useRef(progress);

  useEffect(() => { progressRef.current = progress; }, [progress]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // Offscreen bloom canvas at 1/4 size — blur is cheap at low res
    const bloom = document.createElement('canvas');
    const bCtx = bloom.getContext('2d');

    const { Engine, Runner, Bodies, Body, Composite, Events } = Matter;

    const engine = Engine.create({
      gravity: { y: 2 },
      positionIterations: 3,
      velocityIterations: 2,
      constraintIterations: 1,
      enableSleeping: true,
    });
    const runner = Runner.create({ isFixed: true, delta: 1000 / 50 }); // 50 Hz physics

    const thick = 50;
    let w = 0, h = 0;
    let floor, wallL, wallR;

    const makeStatic = (x, y, W, H) =>
      Bodies.rectangle(x, y, W, H, { isStatic: true });

    const buildWalls = (nw, nh) => {
      if (floor) Composite.remove(engine.world, [floor, wallL, wallR]);
      floor = makeStatic(nw / 2, nh + thick / 2, nw + thick * 2, thick);
      wallL = makeStatic(-thick / 2, nh / 2, thick, nh * 3);
      wallR = makeStatic(nw + thick / 2, nh / 2, thick, nh * 3);
      Composite.add(engine.world, [floor, wallL, wallR]);
    };

    const resize = () => {
      w = container.offsetWidth || 400;
      h = container.offsetHeight || 600;
      canvas.width = w;
      canvas.height = h;
      bloom.width = (w / 4) | 0;
      bloom.height = (h / 4) | 0;
      buildWalls(w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const colorMap = new Map();
    let timeAcc = 0;

    const spawnGrain = () => {
      const bodies = Composite.allBodies(engine.world);
      let dynamicCount = 0;
      for (let i = 0; i < bodies.length; i++) if (!bodies[i].isStatic) dynamicCount++;
      if (dynamicCount >= MAX_BODIES) return;

      timeAcc += 0.06;
      const r = BASE_RADIUS * (0.8 + Math.random() * 0.4);
      const x = r * 2 + Math.random() * Math.max(1, w - r * 4);
      const col = samplePalette(timeAcc + (Math.random() - 0.5) * 0.25);

      const body = Bodies.circle(x, -r * 3, r, {
        restitution: 0.1,
        friction: 0.75,
        frictionAir: 0.015,
        density: 0.005,
        slop: 0.8,
      });
      Body.setVelocity(body, {
        x: (Math.random() - 0.5) * 1.2,
        y: 1 + Math.random() * 1.5,
      });
      colorMap.set(body.id, col);
      Composite.add(engine.world, body);
    };

    // Prune bodies that fall out of bounds
    Events.on(engine, 'afterUpdate', () => {
      const bodies = Composite.allBodies(engine.world);
      for (let i = bodies.length - 1; i >= 0; i--) {
        const b = bodies[i];
        if (!b.isStatic && b.position.y > h + 150) {
          Composite.remove(engine.world, b);
          colorMap.delete(b.id);
        }
      }
    });

    let spawnTimer = null;
    const scheduleSpawn = () => {
      const p = Math.max(0, Math.min(100, progressRef.current));
      const delay = 110 - (p / 100) * 60;
      spawnTimer = setTimeout(() => {
        spawnGrain();
        if (p > 60) spawnGrain();
        scheduleSpawn();
      }, delay);
    };
    scheduleSpawn();

    let animId;
    let frameCount = 0;

    const draw = () => {
      animId = requestAnimationFrame(draw);
      frameCount++;

      ctx.clearRect(0, 0, w, h);

      const all = Composite.allBodies(engine.world);
      const bodies = [];
      for (let i = 0; i < all.length; i++) if (!all[i].isStatic) bodies.push(all[i]);
      if (!bodies.length) return;

      // 1. Draw grains — no shadow, no filter
      ctx.globalAlpha = 0.92;
      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        const [cr, cg, cb] = colorMap.get(b.id) || [255, 180, 220];
        const r = b.circleRadius || BASE_RADIUS;
        const { x, y } = b.position;
        const df = 1 - Math.max(0, Math.min(1, y / h)) * 0.45;
        ctx.fillStyle = `rgb(${(cr * df) | 0},${(cg * df) | 0},${(cb * df) | 0})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // 2. Offscreen bloom (updated every frame so glow doesn't lag)
      const bw = bloom.width;
      const bh = bloom.height;
      const scale = bw / w;
      bCtx.clearRect(0, 0, bw, bh);
      
      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        if (b.isSleeping) continue; // Only glow while falling/active
        
        const [cr, cg, cb] = colorMap.get(b.id) || [255, 180, 220];
        const r = (b.circleRadius || BASE_RADIUS) * scale * 2.0; // wider glow
        bCtx.fillStyle = `rgb(${cr},${cg},${cb})`;
        bCtx.beginPath();
        bCtx.arc(b.position.x * scale, b.position.y * scale, r, 0, Math.PI * 2);
        bCtx.fill();
      }

      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.globalCompositeOperation = 'screen';
      ctx.filter = 'blur(8px)';
      ctx.drawImage(bloom, 0, 0, w, h);
      ctx.restore();
    };

    Runner.run(runner, engine);
    animId = requestAnimationFrame(draw);

    return () => {
      clearTimeout(spawnTimer);
      cancelAnimationFrame(animId);
      Runner.stop(runner);
      Engine.clear(engine);
      canvas.remove();
      ro.disconnect();
      colorMap.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
    />
  );
}