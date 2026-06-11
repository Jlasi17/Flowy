import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';

// --- PIXEL ART DATA (14x14) ---
const PACMAN_OPEN = [
  "00000111100000",
  "00011111111000",
  "00111111111100",
  "01111111111110",
  "01111111111110",
  "11111111110000",
  "11111111000000",
  "11111111000000",
  "11111111110000",
  "01111111111110",
  "01111111111110",
  "00111111111100",
  "00011111111000",
  "00000111100000"
];

const PACMAN_CLOSED = [
  "00000111100000",
  "00011111111000",
  "00111111111100",
  "01111111111110",
  "01111111111110",
  "11111111111111",
  "11111111111111",
  "11111111111111",
  "11111111111111",
  "01111111111110",
  "01111111111110",
  "00111111111100",
  "00011111111000",
  "00000111100000"
];

const PACMAN_LOOK = [
  "00000111100000",
  "00011111111000",
  "00111111111100",
  "01111111111110",
  "01100111100110",
  "11100111100111",
  "11111111111111",
  "11111111111111",
  "11111111111111",
  "01111111111110",
  "01111111111110",
  "00111111111100",
  "00011111111000",
  "00000111100000"
];

const GHOST_SPRITE = [
  "00001111110000",
  "00011111111000",
  "00111111111100",
  "01100111100110",
  "01100111100110",
  "01111111111110",
  "01111111111110",
  "01111111111110",
  "01111111111110",
  "01111111111110",
  "01101100110110",
  "01000100100010",
  "00000000000000",
  "00000000000000"
];

const DRAW_SPRITE = (ctx, sprite, x, y, size, color, dir = 'right') => {
  const pxSize = size / 14;
  ctx.fillStyle = color;
  ctx.save();
  ctx.translate(x + size / 2, y + size / 2);

  if (dir === 'left') {
    ctx.scale(-1, 1);
  } else if (dir === 'up') {
    ctx.rotate(-Math.PI / 2);
  } else if (dir === 'down') {
    ctx.rotate(Math.PI / 2);
  }

  for (let r = 0; r < 14; r++) {
    for (let c = 0; c < 14; c++) {
      if (sprite[r][c] === '1') {
        ctx.fillRect(-size / 2 + c * pxSize, -size / 2 + r * pxSize, pxSize, pxSize);
      }
    }
  }
  ctx.restore();
};

export default function PacmanPremium({ heatmapSquares, boxRect, onClose }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const COLS = 24;
    const ROWS = 7;
    let mapData = Array(ROWS).fill().map(() => Array(COLS).fill(1)); // 1 = wall (empty day)

    heatmapSquares.forEach(sq => {
      if (sq.row < ROWS && sq.col < COLS) {
        if (sq.level > 0) {
          mapData[sq.row][sq.col] = 0; // Path (active day)
        }
      }
    });

    // Make sure borders are closed if we want, or just let them be walls.
    // If a column is fully empty, it acts as a wall.

    let cellSize = Math.min(canvas.width / (COLS + 4), canvas.height / (ROWS + 4));
    let offsetX = (canvas.width - COLS * cellSize) / 2;
    let offsetY = (canvas.height - ROWS * cellSize) / 2;

    // Find the largest connected component of paths (0)
    let visited = Array(ROWS).fill().map(() => Array(COLS).fill(false));
    let largestComponent = [];

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (mapData[r][c] === 0 && !visited[r][c]) {
          let comp = [];
          let q = [{ r, c }];
          visited[r][c] = true;
          while (q.length > 0) {
            let curr = q.shift();
            comp.push(curr);
            let dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            for (let [dr, dc] of dirs) {
              let nr = curr.r + dr;
              let nc = curr.c + dc;
              if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && mapData[nr][nc] === 0 && !visited[nr][nc]) {
                visited[nr][nc] = true;
                q.push({ r: nr, c: nc });
              }
            }
          }
          if (comp.length > largestComponent.length) {
            largestComponent = comp;
          }
        }
      }
    }

    let pacman = { r: 0, c: 0, x: 0, y: 0, dir: 'right', nextDir: 'right', frame: 0, moving: false };

    if (largestComponent.length > 0) {
      // Pick the first cell in the largest component as start pos
      pacman.r = largestComponent[0].r;
      pacman.c = largestComponent[0].c;
      pacman.x = pacman.c * cellSize;
      pacman.y = pacman.r * cellSize;
    }

    let reachable = Array(ROWS).fill().map(() => Array(COLS).fill(false));
    let totalPellets = 0;

    largestComponent.forEach(cell => {
      reachable[cell.r][cell.c] = true;
      totalPellets++;
    });

    // Clear pellets from paths not in the largest component
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (mapData[r][c] === 0 && !reachable[r][c]) {
          mapData[r][c] = 2; // Treat as already eaten/no pellet
        }
      }
    }

    // Ghost spawn locations (try to spawn far away, but must be on reachable path)
    let spawnPoints = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (reachable[r][c] && (r !== pacman.r || c !== pacman.c)) {
          spawnPoints.push({ r, c });
        }
      }
    }
    // Sort by distance from pacman descending
    spawnPoints.sort((a, b) => {
      let distA = Math.abs(a.r - pacman.r) + Math.abs(a.c - pacman.c);
      let distB = Math.abs(b.r - pacman.r) + Math.abs(b.c - pacman.c);
      return distB - distA;
    });

    let ghosts = [
      { r: spawnPoints[0]?.r || 0, c: spawnPoints[0]?.c || 0, color: '#00ffff', dir: 'left' },
      { r: spawnPoints[1]?.r || 0, c: spawnPoints[1]?.c || 0, color: '#ff0000', dir: 'down' },
      { r: spawnPoints[2]?.r || 0, c: spawnPoints[2]?.c || 0, color: '#ffb8ff', dir: 'up' },
    ];
    ghosts.forEach(g => {
      g.x = g.c * cellSize;
      g.y = g.r * cellSize;
    });

    let state = 'PLAYING'; // PLAYING, DEAD, WIN_SEQ1, WIN_SEQ2, WIN_SEQ3
    let stateTimer = 0;
    let particles = [];
    let pelletsEaten = 0;
    let glitchTextOffset = 0;

    const createExplosion = () => {
      // Create thousands of pixels bursting from Pacman's mouth
      for (let i = 0; i < 1500; i++) {
        let angle = Math.random() * Math.PI * 2;
        let speed = Math.random() * 20 + 5;
        // Target is a random heatmap wall coordinate
        let targets = [];
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            if (mapData[r][c] === 1) {
              targets.push({ x: offsetX + c * cellSize, y: offsetY + r * cellSize });
            }
          }
        }
        let target = targets[Math.floor(Math.random() * targets.length)];

        particles.push({
          x: offsetX + pacman.x + cellSize / 2,
          y: offsetY + pacman.y + cellSize / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 10, // burst upwards
          targetX: target ? target.x + Math.random() * cellSize : offsetX + pacman.x,
          targetY: target ? target.y + Math.random() * cellSize : offsetY + pacman.y,
          life: 0,
          color: ['#ff4d85', '#ff9d00', '#ffea00', '#6200ea'][Math.floor(Math.random() * 4)]
        });
      }
    };

    let lastTime = performance.now();
    let animId;

    const loop = (time) => {
      let dt = (time - lastTime) / 1000;
      lastTime = time;
      if (dt > 0.1) dt = 0.1;

      // Update sizes if resized
      cellSize = Math.min(canvas.width / (COLS + 4), canvas.height / (ROWS + 4));
      offsetX = (canvas.width - COLS * cellSize) / 2;
      offsetY = (canvas.height - ROWS * cellSize) / 2;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (state === 'PLAYING') {
        // Handle Pacman Movement (simplified tile-based continuous movement)
        const speed = cellSize * 5 * dt;

        let targetX = pacman.c * cellSize;
        let targetY = pacman.r * cellSize;

        if (Math.abs(pacman.x - targetX) < speed && Math.abs(pacman.y - targetY) < speed) {
          pacman.x = targetX;
          pacman.y = targetY;
          pacman.moving = false;

          // Try nextDir
          let ndR = pacman.r + (pacman.nextDir === 'down' ? 1 : pacman.nextDir === 'up' ? -1 : 0);
          let ndC = pacman.c + (pacman.nextDir === 'right' ? 1 : pacman.nextDir === 'left' ? -1 : 0);

          if (ndR >= 0 && ndR < ROWS && ndC >= 0 && ndC < COLS && mapData[ndR][ndC] !== 1) {
            pacman.dir = pacman.nextDir;
          }

          let dR = pacman.r + (pacman.dir === 'down' ? 1 : pacman.dir === 'up' ? -1 : 0);
          let dC = pacman.c + (pacman.dir === 'right' ? 1 : pacman.dir === 'left' ? -1 : 0);

          if (dR >= 0 && dR < ROWS && dC >= 0 && dC < COLS && mapData[dR][dC] !== 1) {
            pacman.r = dR;
            pacman.c = dC;
            pacman.moving = true;
          }
        }

        if (pacman.moving) {
          if (pacman.dir === 'right') pacman.x += speed;
          if (pacman.dir === 'left') pacman.x -= speed;
          if (pacman.dir === 'down') pacman.y += speed;
          if (pacman.dir === 'up') pacman.y -= speed;
          pacman.frame += dt * 15;
        }

        // Eat Pellet
        if (mapData[Math.round(pacman.y / cellSize)][Math.round(pacman.x / cellSize)] === 0) {
          mapData[Math.round(pacman.y / cellSize)][Math.round(pacman.x / cellSize)] = 2;
          pelletsEaten++;
          if (pelletsEaten >= totalPellets) {
            state = 'WIN_SEQ1';
            stateTimer = 0;
          }
        }

        // Ghost Movement (Wandering)
        ghosts.forEach(g => {
          let gTargetX = g.c * cellSize;
          let gTargetY = g.r * cellSize;

          if (Math.abs(g.x - gTargetX) < speed && Math.abs(g.y - gTargetY) < speed) {
            g.x = gTargetX;
            g.y = gTargetY;

            // Pick random valid dir
            let dirs = ['up', 'down', 'left', 'right'];
            let valid = dirs.filter(d => {
              let ndR = g.r + (d === 'down' ? 1 : d === 'up' ? -1 : 0);
              let ndC = g.c + (d === 'right' ? 1 : d === 'left' ? -1 : 0);
              return ndR >= 0 && ndR < ROWS && ndC >= 0 && ndC < COLS && mapData[ndR][ndC] !== 1 && d !== (g.dir === 'up' ? 'down' : g.dir === 'down' ? 'up' : g.dir === 'left' ? 'right' : 'left');
            });
            if (valid.length === 0) {
              g.dir = g.dir === 'up' ? 'down' : g.dir === 'down' ? 'up' : g.dir === 'left' ? 'right' : 'left';
            } else {
              g.dir = valid[Math.floor(Math.random() * valid.length)];
            }

            g.r += (g.dir === 'down' ? 1 : g.dir === 'up' ? -1 : 0);
            g.c += (g.dir === 'right' ? 1 : g.dir === 'left' ? -1 : 0);
          }

          if (g.dir === 'right') g.x += speed * 0.8;
          if (g.dir === 'left') g.x -= speed * 0.8;
          if (g.dir === 'down') g.y += speed * 0.8;
          if (g.dir === 'up') g.y -= speed * 0.8;

          // Collision
          if (Math.abs(pacman.x - g.x) < cellSize * 0.8 && Math.abs(pacman.y - g.y) < cellSize * 0.8) {
            state = 'DEAD';
            stateTimer = 0;
          }
        });
      }

      // Draw Walls & Paths
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          let px = offsetX + c * cellSize;
          let py = offsetY + r * cellSize;

          if (mapData[r][c] !== 1) {
            // Path (active day)
            if (state === 'WIN_SEQ3') {
              // Fade out during explosion
              ctx.globalAlpha = Math.max(0, 1 - stateTimer);
            }

            // Draw faded heatmap background
            ctx.fillStyle = 'rgba(255, 77, 133, 0.3)';
            ctx.fillRect(px + 2, py + 2, cellSize - 4, cellSize - 4);

            ctx.globalAlpha = 1;

            // Draw Pellet if it hasn't been eaten
            if (mapData[r][c] === 0) {
              ctx.fillStyle = '#ffffff';
              ctx.globalAlpha = 0.8;
              ctx.shadowColor = '#ffffff';
              ctx.shadowBlur = 5;
              ctx.fillRect(px + cellSize / 2 - 3, py + cellSize / 2 - 3, 6, 6);
              ctx.shadowBlur = 0;
              ctx.globalAlpha = 1;
            }
          }
        }
      }

      // Draw Entities (unless in final explode phase)
      if (state !== 'WIN_SEQ3') {
        let isClosed = pacman.moving ? Math.floor(pacman.frame) % 2 === 0 : false;
        let sprite = isClosed ? PACMAN_CLOSED : PACMAN_OPEN;

        if (state === 'WIN_SEQ1' || state === 'WIN_SEQ2') {
          sprite = PACMAN_LOOK;
        }

        DRAW_SPRITE(
          ctx,
          sprite,
          offsetX + pacman.x + 2,
          offsetY + pacman.y + 2,
          cellSize - 4,
          '#ffea00',
          state === 'WIN_SEQ1' ? 'right' : pacman.dir
        );

        ghosts.forEach(g => {
          DRAW_SPRITE(ctx, GHOST_SPRITE, offsetX + g.x + 2, offsetY + g.y + 2, cellSize - 4, g.color, g.dir);
        });
      }

      // State Logic
      if (state === 'DEAD') {
        stateTimer += dt;
        ctx.fillStyle = `rgba(255,0,0,${Math.min(0.5, stateTimer)})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#ffffff';
        ctx.font = '80px "Upheaval", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        glitchTextOffset = Math.random() > 0.8 ? (Math.random() - 0.5) * 20 : 0;
        ctx.fillText("CONNECTION LOST", canvas.width / 2 + glitchTextOffset, canvas.height / 2);

        if (stateTimer > 2) {
          onClose();
          return; // stop loop
        }
      } else if (state === 'WIN_SEQ1') {
        // Pacman stops and looks at user
        stateTimer += dt;
        if (stateTimer > 1.5) {
          state = 'WIN_SEQ2';
          stateTimer = 0;
        }
      } else if (state === 'WIN_SEQ2') {
        // Everything goes dark
        stateTimer += dt;
        ctx.fillStyle = `rgba(0,0,0,${Math.min(1, stateTimer * 2)})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Pacman stays bright
        DRAW_SPRITE(ctx, PACMAN_OPEN, offsetX + pacman.x + 2, offsetY + pacman.y + 2, cellSize - 4, '#ffea00', 'up'); // Mouth opens upward

        if (stateTimer > 1.5) {
          state = 'WIN_SEQ3';
          stateTimer = 0;
          createExplosion();
        }
      } else if (state === 'WIN_SEQ3') {
        stateTimer += dt;
        ctx.fillStyle = `rgba(0,0,0,1)`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw and update particles
        particles.forEach(p => {
          p.life += dt;

          // Phase 1: Burst outwards (0 to 1 sec)
          if (p.life < 1.0) {
            p.x += p.vx * dt * 60;
            p.y += p.vy * dt * 60;
            p.vx *= 0.95; // friction
            p.vy *= 0.95;
            p.vy += 0.5; // gravity
          }
          // Phase 2: Swarm towards heatmap targets (1 to 3 sec)
          else {
            let dx = p.targetX - p.x;
            let dy = p.targetY - p.y;
            p.x += dx * dt * 3;
            p.y += dy * dt * 3;
          }

          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 10;
          ctx.fillRect(p.x, p.y, 4, 4);
          ctx.shadowBlur = 0;
        });

        if (stateTimer > 3.5) {
          onClose();
          return;
        }
      }

      // CRT Scanline Overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      for (let i = 0; i < canvas.height; i += 4) {
        ctx.fillRect(0, i, canvas.width, 2);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    const handleKeyDown = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        if (e.key === 'ArrowUp') pacman.nextDir = 'up';
        if (e.key === 'ArrowDown') pacman.nextDir = 'down';
        if (e.key === 'ArrowLeft') pacman.nextDir = 'left';
        if (e.key === 'ArrowRight') pacman.nextDir = 'right';
      }
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(animId);
    };
  }, [heatmapSquares]);

  return createPortal(
    <motion.div
      initial={boxRect ? {
        top: boxRect.top,
        left: boxRect.left,
        width: boxRect.width,
        height: boxRect.height,
        borderRadius: 20,
        opacity: 0.5
      } : { opacity: 0, scale: 0.8 }}
      animate={{
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        borderRadius: 0,
        opacity: 1
      }}
      exit={boxRect ? {
        top: boxRect.top,
        left: boxRect.left,
        width: boxRect.width,
        height: boxRect.height,
        borderRadius: 20,
        opacity: 0
      } : { opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{
        position: 'fixed',
        background: '#05050f',
        zIndex: 99999,
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        overflow: 'hidden'
      }}
    >
      {/* The Game Canvas */}
      <canvas ref={canvasRef} style={{ display: 'block', imageRendering: 'pixelated', width: '100%', height: '100%' }} />

      {/* CRT Overlay: Scanlines and Vignette */}
      <div style={{
        position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
        pointerEvents: "none", zIndex: 10,
        background: `linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))`,
        backgroundSize: '100% 4px, 6px 100%',
        boxShadow: "inset 0 0 150px rgba(0,0,0,0.9)"
      }}></div>

      {/* Glass Glare Reflection */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 11,
        background: 'linear-gradient(105deg, rgba(255,255,255,0) 45%, rgba(255,255,255,0.04) 46%, rgba(255,255,255,0.08) 70%, rgba(255,255,255,0) 71%)'
      }}></div>

      {/* Arcade / Monitor Bezel (The thick plastic frame) */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 12,
        boxSizing: 'border-box',
        borderTop: '6vw solid #25243e',    // Lighter top for 3D light
        borderBottom: '6vw solid #0d0c18', // Darker bottom for 3D shadow
        borderLeft: '6vw solid #171629',   // Midtone sides
        borderRight: '6vw solid #171629',
        borderRadius: '12vw / 16vh',       // Perfect CRT tube curvature
        boxShadow: 'inset 0 0 40px rgba(0,0,0,0.9), 0 0 0 100vw #171629' // Fills the outer screen corners
      }}></div>
    </motion.div>,
    document.body
  );
}
