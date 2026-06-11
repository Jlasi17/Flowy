
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import WebGLFluid from "webgl-fluid";
import { motion, useScroll, useTransform, AnimatePresence, useInView, useMotionValueEvent, useMotionTemplate } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Fireworks } from '@fireworks-js/react';
import LyricsPanel from "./components/LyricsPanel";
import { AudioContext } from "./AudioPlayerProvider";
import confetti from "canvas-confetti";
import groupsData from "./data/musicRegistry";

import PacmanPremium from './PacmanPremium';
import GlobalMuteButton, { GlobalMuteManager } from "./components/GlobalMuteButton";
import "./FeaturesPage.css";

let audioCtx = null;
let popBuffer = null;

async function initPopAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    try {
      const response = await fetch('/soundeffects/bubble_pop.mp3');
      const arrayBuffer = await response.arrayBuffer();
      popBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    } catch (e) {
      console.log("Failed to load pop sound", e);
    }
  }
}

function playPopSound() {
  if (GlobalMuteManager && GlobalMuteManager.isMuted) return;
  try {
    if (!audioCtx) {
      initPopAudio();
    }
    if (audioCtx && popBuffer) {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const source = audioCtx.createBufferSource();
      source.buffer = popBuffer;
      // Lower the volume slightly so it's not overpowering
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = 0.5;
      source.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      source.start(0);
    } else {
      // Fallback
      const audio = new Audio('/soundeffects/bubble_pop.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => { });
    }
  } catch (e) {
    console.log("Audio pop failed", e);
  }
}

class GaplessAudio {
  constructor(url) {
    this.url = url;
    this._volume = 1;
    this._playRequested = false;
    this.buffer = null;
    this.source = null;
    this.gainNode = null;
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    this.startTime = 0;
    this.pausedAt = 0;
    this.loopStart = 0;
    this.loopEnd = 0;
    this._isMuted = false;

    this.load();
  }

  async load() {
    try {
      const response = await fetch(this.url);
      const arrayBuffer = await response.arrayBuffer();
      this.buffer = await audioCtx.decodeAudioData(arrayBuffer);

      // Dynamically calculate exact trim points by scanning for silence (typical mp3 padding)
      const channelData = this.buffer.getChannelData(0);
      const threshold = 0.01; // Silence threshold
      let startSample = 0;
      let endSample = channelData.length - 1;

      for (let i = 0; i < channelData.length; i++) {
        if (Math.abs(channelData[i]) > threshold) {
          startSample = i;
          break;
        }
      }
      for (let i = channelData.length - 1; i >= 0; i--) {
        if (Math.abs(channelData[i]) > threshold) {
          endSample = i;
          break;
        }
      }

      this.loopStart = Math.max(0, (startSample) / this.buffer.sampleRate);
      this.loopEnd = Math.min(this.buffer.duration, (endSample) / this.buffer.sampleRate);

      if (this._playRequested) {
        this._startPlaying();
      }
    } catch (e) {
      console.error('Gapless audio load failed', e);
    }
  }

  _startPlaying() {
    if (!this.buffer) return;
    if (this.source) return;

    this.source = audioCtx.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.loop = true;

    // Apply dynamic trimming
    if (this.loopEnd > this.loopStart) {
      this.source.loopStart = this.loopStart;
      this.source.loopEnd = this.loopEnd;
    }

    this.gainNode = audioCtx.createGain();
    this.gainNode.gain.value = this._isMuted ? 0 : this._volume;

    this.source.connect(this.gainNode);
    this.gainNode.connect(audioCtx.destination);

    let offset = this.pausedAt % this.buffer.duration;
    if (offset < this.loopStart) offset = this.loopStart;

    this.source.start(0, offset);
    this.startTime = audioCtx.currentTime - offset;
  }

  play() {
    this._playRequested = true;
    return new Promise(async (resolve) => {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      this._startPlaying();
      resolve();
    });
  }

  pause() {
    this._playRequested = false;
    if (this.source) {
      this.pausedAt = audioCtx.currentTime - this.startTime;
      this.source.stop();
      this.source.disconnect();
      this.source = null;
    }
  }

  setMuted(muted) {
    this._isMuted = muted;
    if (this.gainNode && audioCtx) {
      this.gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
      this.gainNode.gain.value = this._isMuted ? 0 : this._volume;
    }
  }

  set volume(val) {
    this._volume = Math.max(0, Math.min(1, val));
    if (this.gainNode && audioCtx) {
      this.gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
      this.gainNode.gain.value = this._isMuted ? 0 : this._volume;
    }
  }

  fadeVolume(targetVal, durationMs = 1500) {
    this._volume = Math.max(0, Math.min(1, targetVal));
    if (this.gainNode && audioCtx && !this._isMuted) {
      const currTime = audioCtx.currentTime;
      // Use setTargetAtTime for a smooth, exponential fade that doesn't glitch
      this.gainNode.gain.setTargetAtTime(this._volume, currTime, durationMs / 3000);
    }
  }

  get volume() {
    return this._volume;
  }
}

const EXPO_OUT = [0.16, 1, 0.3, 1];
const SPRING_BOUNCE = { type: "spring", stiffness: 120, damping: 12 };

// ─── SplitText ────────────────────────────────────────────────────────────────
function SplitText({ text, className, style, mode = "chars", staggerDelay = 0.025, baseDelay = 0 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, amount: 0.5 });
  const units = mode === "chars" ? text.split("") : text.split(" ");
  const containerVariants = { hidden: {}, visible: { transition: { staggerChildren: staggerDelay, delayChildren: baseDelay } } };
  const charVariants = { hidden: { y: "100%", opacity: 0 }, visible: { y: "0%", opacity: 1, transition: { duration: 0.65, ease: EXPO_OUT } } };
  return (
    <motion.span ref={ref} className={className} style={{ display: "inline-block", ...style }} variants={containerVariants} initial="hidden" animate={isInView ? "visible" : "hidden"}>
      {units.map((unit, i) => (
        <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom" }}>
          <motion.span variants={charVariants} style={{ display: "inline-block" }}>{unit === " " ? "\u00A0" : unit}</motion.span>
        </span>
      ))}
    </motion.span>
  );
}

// ─── WordReveal ───────────────────────────────────────────────────────────────
function WordReveal({ text, style, className, stagger = 0.08, baseDelay = 0 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, amount: 0.4 });
  const words = text.split(" ");
  return (
    <span ref={ref} className={className} style={{ display: "block", ...style }}>
      {words.map((word, i) => (
        <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom", marginRight: "0.28em" }}>
          <motion.span style={{ display: "inline-block" }} initial={{ y: "105%" }} animate={isInView ? { y: "0%" } : { y: "105%" }} transition={{ duration: 0.75, ease: EXPO_OUT, delay: baseDelay + i * stagger }}>{word}</motion.span>
        </span>
      ))}
    </span>
  );
}

// ─── BlurSlideReveal ──────────────────────────────────────────────────────────
function BlurSlideReveal({ text, style, className, delay = 0 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, amount: 0.5 });
  return (
    <motion.span ref={ref} className={className} style={{ display: "block", ...style }} initial={{ x: 40, opacity: 0, filter: "blur(14px)" }} animate={isInView ? { x: 0, opacity: 1, filter: "blur(0px)" } : { x: 40, opacity: 0, filter: "blur(14px)" }} transition={{ duration: 1.1, ease: EXPO_OUT, delay }}>{text}</motion.span>
  );
}

// ─── SlowScaleReveal ──────────────────────────────────────────────────────────
function SlowScaleReveal({ children, style, delay = 0 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, amount: 0.5 });
  return (
    <motion.span ref={ref} style={{ display: "block", ...style }} initial={{ scale: 0.94, opacity: 0 }} animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0.94, opacity: 0 }} transition={{ duration: 1.3, ease: EXPO_OUT, delay }}>{children}</motion.span>
  );
}

// ─── SpringCharReveal ─────────────────────────────────────────────────────────
function SpringCharReveal({ text, style, className }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, amount: 0.5 });
  const chars = text.split("");
  const containerVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.04 } } };
  const charVariants = { hidden: { y: 80, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { ...SPRING_BOUNCE } } };
  return (
    <motion.span ref={ref} className={className} style={{ display: "inline-block", ...style }} variants={containerVariants} initial="hidden" animate={isInView ? "visible" : "hidden"}>
      {chars.map((char, i) => (
        <motion.span key={i} variants={charVariants} style={{ display: "inline-block" }}>{char === " " ? "\u00A0" : char}</motion.span>
      ))}
    </motion.span>
  );
}

// ─── BubbleExplosion (canvas burst on pop) ────────────────────────────────────
function BubbleExplosion({ x, y, color, onDone }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width = window.innerWidth;
    const H = canvas.height = window.innerHeight;
    const particles = Array.from({ length: 22 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 5;
      return {
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        r: 2 + Math.random() * 4,
        alpha: 1,
        color: Math.random() > 0.5 ? color : "rgba(255, 255, 255, 0.95)"
      };
    });
    let raf;
    function draw() {
      ctx.clearRect(0, 0, W, H);
      let alive = false;
      particles.forEach(p => {
        if (p.alpha <= 0) return;
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.18;
        p.alpha -= 0.032;
        p.r *= 0.97;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(p.r, 0.1), 0, Math.PI * 2);
        ctx.fillStyle = p.color.replace(")", `,${Math.max(p.alpha, 0)})`).replace("rgb", "rgba");
        ctx.fill();
      });
      if (alive) raf = requestAnimationFrame(draw);
      else onDone();
    }
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", pointerEvents: "none", zIndex: 9999 }}
    />
  );
}

// ─── InteractiveImageParticles ───────────────────────────────────
function InteractiveImageParticles({ src }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width = window.innerWidth;
    const H = canvas.height = window.innerHeight;

    let mouse = { x: -1000, y: -1000 };

    const onMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    window.addEventListener("mousemove", onMouseMove);

    const img = new Image();
    img.src = src;
    let raf;

    img.onload = () => {
      const offCanvas = document.createElement("canvas");
      const offCtx = offCanvas.getContext("2d");

      const imgSize = 384;
      offCanvas.width = imgSize;
      offCanvas.height = imgSize;

      offCtx.fillStyle = '#e5ff00';
      offCtx.fillRect(0, 0, imgSize, imgSize);
      offCtx.drawImage(img, 0, 0, imgSize, imgSize);

      const imgData = offCtx.getImageData(0, 0, imgSize, imgSize).data;
      const particles = [];
      const step = 6;

      const startX = W / 2 - imgSize / 2;
      const startY = H / 2 - imgSize / 2;

      for (let y = 0; y < imgSize; y += step) {
        for (let x = 0; x < imgSize; x += step) {
          const i = (y * imgSize + x) * 4;
          if (imgData[i + 3] > 0) {
            const targetX = startX + x;
            const targetY = startY + y;
            particles.push({
              targetX,
              targetY,
              x: W / 2 + (Math.random() - 0.5) * 150,
              y: H / 2 + (Math.random() - 0.5) * 150,
              color: `rgba(${imgData[i]}, ${imgData[i + 1]}, ${imgData[i + 2]}, ${imgData[i + 3] / 255})`,
              vx: (Math.random() - 0.5) * 40,
              vy: (Math.random() - 0.5) * 40,
              size: step * 0.95
            });
          }
        }
      }

      function draw() {
        ctx.clearRect(0, 0, W, H);
        particles.forEach(p => {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            const force = (120 - dist) / 120;
            p.vx -= (dx / dist) * force * 15;
            p.vy -= (dy / dist) * force * 15;
          }

          // Spring back to target
          p.vx += (p.targetX - p.x) * 0.05;
          p.vy += (p.targetY - p.y) * 0.05;

          // Friction
          p.vx *= 0.85;
          p.vy *= 0.85;

          p.x += p.vx;
          p.y += p.vy;

          ctx.fillStyle = p.color;
          ctx.fillRect(p.x, p.y, p.size, p.size);
        });

        raf = requestAnimationFrame(draw);
      }
      draw();
    };

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [src]);

  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", pointerEvents: "none", zIndex: 1 }} />;
}

// ─── Song Bubble ──────────────────────────────────────────────────────────────
function SongBubble({ track, index, position, onPlay, isActive, visible }) {
  const [hovered, setHovered] = useState(false);
  const accentColors = {
    "Blood Sweat & Tears": "#ff4d85",
    "Sugar Rush Ride": "#00e5ff",
    "Smart": "#e5ff00",
    "FAKE LOVE": "#ff9d00",
    "HOT": "#39ff14",
    "Do It Like That": "#a78bfa",
    "Perfect Night": "#ff4d85",
    "Dynamite": "#ffea00",
    "ANTIFRAGILE": "#00e5ff",
  };
  const accent = accentColors[track.title] || "#a78bfa";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fp-bubble-song"
          style={{
            position: "absolute",
            left: position.x,
            top: position.y,
            width: position.size,
            height: position.size,
            "--accent": accent,
          }}
          initial={{ y: "120vh", opacity: 0, scale: 0.5 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: "120vh", opacity: 0, scale: 0.5, transition: { duration: 0.7, ease: [0.22, 0.61, 0.36, 1], delay: position.delay * 0.5 } }}
          transition={{ duration: 1.1 + position.delay * 0.3, ease: [0.22, 0.61, 0.36, 1], delay: position.delay }}
          onHoverStart={() => setHovered(true)}
          onHoverEnd={() => setHovered(false)}
          onClick={() => onPlay(track)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.93 }}
        >
          {/* Blurred album art bg */}
          <div
            className="fp-bubble-album-bg"
            style={{
              backgroundImage: `url(${track.cover})`,
              opacity: hovered ? 1 : 0,
            }}
          />
          {/* Glass shell matching the reference image's deep dark reflections */}
          <div className="fp-bubble-glass" style={{
            boxShadow: hovered
              ? `inset -10px -15px 30px rgba(0,0,0,0.8), inset 15px 15px 40px rgba(255,255,255,0.3), 0 0 38px 10px ${accent}70, 0 0 70px 22px ${accent}28, inset 0 0 20px ${accent}40`
              : `inset -10px -15px 30px rgba(0,0,0,0.9), inset 15px 15px 40px rgba(255,255,255,0.15), inset 0 0 10px rgba(255,255,255,0.07), 0 10px 40px rgba(0,0,0,0.5)`
          }} />
          {/* Gloss */}
          <div className="fp-bubble-gloss" />
          <div className="fp-bubble-gloss-bot" />
          {/* Rim */}
          <div className="fp-bubble-rim" style={{ borderColor: hovered ? `${accent}90` : "rgba(255,255,255,0.15)" }} />
          {/* Text */}
          <div className="fp-bubble-inner">
            <span className="fp-bubble-title" style={{
              color: isActive ? accent : "#fff",
              textShadow: hovered ? `0 1px 10px rgba(0,0,0,0.95), 0 0 22px ${accent}ee` : "0 1px 10px rgba(0,0,0,0.95)",
              fontSize: position.size < 110 ? "0.72rem" : position.size < 140 ? "0.88rem" : "1rem"
            }}>
              {track.title}
            </span>
          </div>
          {/* Active ring */}
          {isActive && <div className="fp-bubble-active-ring" style={{ borderColor: accent }} />}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Empty decorative bubble (poppable) ───────────────────────────────────────
function EmptyBubble({ position, onPop, popped, visible }) {
  const [exploding, setExploding] = useState(false);
  const [explodePos, setExplodePos] = useState({ x: 0, y: 0 });

  const handleClick = (e) => {
    if (popped) return;
    playPopSound();
    const rect = e.currentTarget.getBoundingClientRect();
    setExplodePos({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    setExploding(true);
    onPop();
  };

  return (
    <>
      {exploding && (
        <BubbleExplosion
          x={explodePos.x}
          y={explodePos.y}
          color="rgba(255, 255, 255, 0.95)"
          onDone={() => setExploding(false)}
        />
      )}
      <AnimatePresence custom={popped}>
        {!popped && visible && (
          <motion.div
            custom={popped}
            className="fp-bubble-empty"
            style={{
              position: "absolute",
              left: position.x,
              top: position.y,
              width: position.size,
              height: position.size,
            }}
            variants={{
              hidden: { y: "120vh", opacity: 0, scale: 0.5 },
              visible: {
                y: 0, opacity: 1, scale: 1,
                transition: { duration: 1.1 + position.delay * 0.3, ease: [0.22, 0.61, 0.36, 1], delay: position.delay }
              },
              exit: (isPopping) => isPopping
                ? { opacity: 0, scale: 1.2, transition: { duration: 0.1 } }
                : { y: "120vh", opacity: 0, scale: 0.5, transition: { duration: 0.7, ease: [0.22, 0.61, 0.36, 1], delay: position.delay * 0.5 } }
            }}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={handleClick}
            whileHover={{ scale: 1.07, cursor: "pointer" }}
          >
            {/* Same glass shell as song bubbles */}
            <div className="fp-bubble-glass" style={{
              boxShadow: `inset -10px -15px 30px rgba(0,0,0,0.9), inset 15px 15px 40px rgba(255,255,255,0.15), inset 0 0 10px rgba(255,255,255,0.07), 0 10px 40px rgba(0,0,0,0.5)`
            }} />
            <div className="fp-bubble-gloss" />
            <div className="fp-bubble-gloss-bot" />
            <div className="fp-bubble-rim" style={{ borderColor: "rgba(255,255,255,0.15)" }} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── The full bubble field that appears inside the card ───────────────────────
function BubbleTracklist({ tracklist, onPlay, activeTrack, visible }) {
  // Pre-popped state for empty bubbles
  const [poppedBubbles, setPoppedBubbles] = useState({});

  // Song bubble positions matching the exact layout of the reference image:
  // 1: top-left, 2: bottom-mid-left, 3: top-right, 4: top-mid-left, 5: bottom-right (huge), 6: bottom-left, 7: mid-right, 8: mid-left, 9: mid-bottom-right
  const songPositions = [
    { x: "12%", y: "8%", size: 160, delay: 0.05 },   // 1
    { x: "28%", y: "78%", size: 140, delay: 0.22 },  // 2
    { x: "72%", y: "5%", size: 150, delay: 0.14 },   // 3
    { x: "36%", y: "4%", size: 110, delay: 0.31 },   // 4
    { x: "82%", y: "74%", size: 210, delay: 0.42 },  // 5
    { x: "6%", y: "58%", size: 130, delay: 0.38 },   // 6
    { x: "88%", y: "36%", size: 120, delay: 0.55 },  // 7
    { x: "18%", y: "40%", size: 100, delay: 0.62 },  // 8
    { x: "68%", y: "54%", size: 130, delay: 0.48 },  // 9
  ];

  // Empty decorative bubbles scattered in the background with vastly different sizes
  const emptyPositions = [
    // Original ones
    { x: "26%", y: "2%", size: 40, delay: 0.18 },
    { x: "44%", y: "2%", size: 24, delay: 0.28 },
    { x: "50%", y: "8%", size: 36, delay: 0.35 },
    { x: "60%", y: "5%", size: 50, delay: 0.52 },
    { x: "92%", y: "8%", size: 40, delay: 0.44 },
    { x: "64%", y: "20%", size: 30, delay: 0.60 },
    { x: "88%", y: "24%", size: 20, delay: 0.72 },
    { x: "78%", y: "34%", size: 40, delay: 0.68 },
    { x: "66%", y: "42%", size: 20, delay: 0.58 },
    { x: "94%", y: "58%", size: 20, delay: 0.40 },
    { x: "70%", y: "76%", size: 30, delay: 0.25 },
    { x: "60%", y: "82%", size: 60, delay: 0.74 },
    { x: "54%", y: "76%", size: 20, delay: 0.33 },
    { x: "48%", y: "82%", size: 45, delay: 0.51 },
    { x: "20%", y: "84%", size: 30, delay: 0.64 },
    { x: "28%", y: "58%", size: 30, delay: 0.81 },
    { x: "18%", y: "38%", size: 18, delay: 0.21 },
    { x: "18%", y: "28%", size: 22, delay: 0.41 },
    { x: "28%", y: "22%", size: 45, delay: 0.31 },
    { x: "6%", y: "32%", size: 35, delay: 0.55 },

    // NEW BUBBLES
    // Very large background bubbles
    { x: "10%", y: "85%", size: 85, delay: 0.4 },
    { x: "90%", y: "70%", size: 95, delay: 0.6 },
    { x: "85%", y: "15%", size: 75, delay: 0.3 },
    { x: "4%", y: "18%", size: 80, delay: 0.8 },

    // Medium-large
    { x: "40%", y: "90%", size: 65, delay: 0.9 },
    { x: "55%", y: "94%", size: 55, delay: 0.2 },
    { x: "75%", y: "90%", size: 70, delay: 0.5 },
    { x: "96%", y: "40%", size: 60, delay: 0.7 },
    { x: "2%", y: "50%", size: 58, delay: 0.45 },
    { x: "22%", y: "92%", size: 62, delay: 0.15 },

    // Medium
    { x: "15%", y: "5%", size: 45, delay: 0.65 },
    { x: "32%", y: "12%", size: 35, delay: 0.85 },
    { x: "68%", y: "8%", size: 48, delay: 0.25 },
    { x: "82%", y: "22%", size: 38, delay: 0.95 },
    { x: "95%", y: "85%", size: 42, delay: 0.35 },
    { x: "12%", y: "45%", size: 46, delay: 0.75 },
    { x: "8%", y: "75%", size: 34, delay: 0.55 },
    { x: "85%", y: "55%", size: 44, delay: 0.45 },

    // Tiny background details
    { x: "2%", y: "8%", size: 15, delay: 0.1 },
    { x: "20%", y: "15%", size: 18, delay: 0.5 },
    { x: "40%", y: "22%", size: 12, delay: 0.9 },
    { x: "60%", y: "28%", size: 16, delay: 0.3 },
    { x: "80%", y: "48%", size: 14, delay: 0.7 },
    { x: "98%", y: "65%", size: 12, delay: 0.2 },
    { x: "88%", y: "95%", size: 15, delay: 0.6 },
    { x: "65%", y: "92%", size: 18, delay: 0.8 },
    { x: "35%", y: "95%", size: 14, delay: 0.4 },
    { x: "15%", y: "90%", size: 16, delay: 0.25 },
    { x: "5%", y: "65%", size: 12, delay: 0.75 },
    { x: "25%", y: "48%", size: 15, delay: 0.15 },
    { x: "12%", y: "28%", size: 14, delay: 0.85 },
  ];

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* Song bubbles */}
      {tracklist.map((track, i) => (
        <SongBubble
          key={track.title}
          track={track}
          index={i}
          position={songPositions[i]}
          onPlay={onPlay}
          isActive={activeTrack?.title === track.title}
          visible={visible}
        />
      ))}

      {/* Empty poppable bubbles */}
      {emptyPositions.map((pos, i) => (
        <EmptyBubble
          key={i}
          position={pos}
          popped={!!poppedBubbles[i]}
          visible={visible}
          onPop={() => {
            setPoppedBubbles(prev => ({ ...prev, [i]: true }));
            // Respawn the bubble after 2 seconds so it floats back into place
            setTimeout(() => {
              setPoppedBubbles(prev => ({ ...prev, [i]: false }));
            }, 2000);
          }}
        />
      ))}
    </div>
  );
}

// ─── HeroText ─────────────────────────────────────────────────────────────────
function HeroText({ textScale, textY }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 200); return () => clearTimeout(t); }, []);

  const line1 = "MUSIC", line2 = "SHOULD BE", line3 = "FELT.";
  const makeVariants = (baseDelay) => ({
    hidden: { y: 60, opacity: 0 },
    visible: (i) => ({ y: 0, opacity: 1, transition: { duration: 0.7, ease: EXPO_OUT, delay: baseDelay + i * 0.028 } })
  });

  return (
    <motion.g style={{ transformOrigin: "50% 50%", scale: textScale, y: textY }}>
      {[{ text: line1, y: "35%", variants: makeVariants(0) }, { text: line2, y: "50%", variants: makeVariants(0.15) }, { text: line3, y: "65%", variants: makeVariants(0.3) }].map(({ text, y, variants }) => (
        <text key={y} x="25%" y={y} textAnchor="start" fontSize="11vw" fontWeight="900" letterSpacing="-0.04em" fontFamily="'Clash Display', sans-serif" fill="black">
          {text.split("").map((char, i) => (
            <motion.tspan key={i} custom={i} variants={variants} initial="hidden" animate={visible ? "visible" : "hidden"} dy={0} dx={char === " " ? "0.3em" : 0}>
              {char === " " ? "\u00A0" : char}
            </motion.tspan>
          ))}
        </text>
      ))}
    </motion.g>
  );
}

// ─── TypedEllipsis ────────────────────────────────────────────────────────────
function TypedEllipsis({ delay = 0.8 }) {
  const [dots, setDots] = useState("");
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, amount: 0.5 });
  useEffect(() => {
    if (!isInView) { setDots(""); return; }
    const t = setTimeout(() => {
      let count = 0;
      const interval = setInterval(() => { count++; setDots(".".repeat(Math.min(count, 3))); if (count >= 3) clearInterval(interval); }, 160);
      return () => clearInterval(interval);
    }, delay * 1000);
    return () => clearTimeout(t);
  }, [isInView, delay]);
  return <span ref={ref}>{dots}</span>;
}

// ─── GradientSlideTitle ───────────────────────────────────────────────────────
function GradientSlideTitle({ text, style }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, amount: 0.5 });
  return (
    <motion.h2 ref={ref} initial={{ opacity: 0, scale: 0.97, backgroundPositionX: "100%" }} animate={isInView ? { opacity: 1, scale: 1, backgroundPositionX: "0%" } : { opacity: 0, scale: 0.97, backgroundPositionX: "100%" }} transition={{ duration: 0.9, ease: EXPO_OUT }}
      style={{ ...style, background: "linear-gradient(90deg, #ffea00, #ff9d00, #ff4d85, #6200ea)", backgroundSize: "200% 100%", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
      {text}
    </motion.h2>
  );
}

// ─── FireworksBackground ──────────────────────────────────────────────────────
function FireworksBackground() {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { margin: "0px" });
  if (!isInView) return <div ref={containerRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }} />;
  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
      <Fireworks options={{ opacity: 0.5, particles: 100, explosion: 5, intensity: 25, traceSpeed: 3, friction: 0.95, gravity: 1.5, sound: { enable: false }, lineWidth: { trace: { min: 0, max: 0 } } }}
        style={{ top: 0, left: 0, width: '100%', height: '100%', position: 'absolute' }} />
    </div>
  );
}

// ─── ScrollTransformingText ───────────────────────────────────────────────────
function ScrollTransformingText({ containerRef }) {
  const targetRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: targetRef, container: containerRef, offset: ["start end", "end start"] });
  const opacity1 = useTransform(scrollYProgress, [0.15, 0.33, 0.5], [0, 1, 0]);
  const scale1 = useTransform(scrollYProgress, [0.15, 0.5], [0.8, 1.2]);
  const blur1 = useTransform(scrollYProgress, [0.15, 0.33, 0.5], ["blur(10px)", "blur(0px)", "blur(10px)"]);
  const opacity2 = useTransform(scrollYProgress, [0.5, 0.66, 0.85], [0, 1, 0]);
  const scale2 = useTransform(scrollYProgress, [0.5, 0.85], [0.8, 1.2]);
  const blur2 = useTransform(scrollYProgress, [0.5, 0.66, 0.85], ["blur(10px)", "blur(0px)", "blur(10px)"]);
  const bgOpacity = useTransform(scrollYProgress, [0.15, 0.33, 0.66], [0.0, 0.8, 0.8]);

  return (
    <div ref={targetRef} style={{ height: "200vh", width: "100%", position: "relative", zIndex: 10 }}>
      <div style={{ height: "100vh", width: "100%", scrollSnapAlign: "start", flexShrink: 0 }} />
      <div style={{ height: "100vh", width: "100%", scrollSnapAlign: "start", flexShrink: 0 }} />
      <div style={{ position: "sticky", top: 0, left: 0, height: "100vh", width: "100%", marginTop: "-200vh", display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden", pointerEvents: "none" }}>
        <motion.div style={{ position: "absolute", inset: 0, background: "#000", opacity: bgOpacity }} />
        <motion.h2 style={{ position: "absolute", fontSize: "5rem", fontWeight: 800, letterSpacing: "-0.02em", color: "#fff", textAlign: "center", lineHeight: 1.1, fontFamily: "'Clash Display', sans-serif", opacity: opacity1, scale: scale1, filter: blur1 }}>Wanna sing along??</motion.h2>
        <motion.h2 style={{ position: "absolute", fontSize: "5rem", fontWeight: 800, letterSpacing: "-0.02em", color: "#fff", textAlign: "center", margin: 0, opacity: opacity2, scale: scale2, filter: blur2 }}>No worries we got you</motion.h2>
      </div>
    </div>
  );
}

// ─── CinematicCTA ─────────────────────────────────────────────────────────────
function CinematicCTA({ onClick }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, amount: 0.5 });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, scale: 0.9 }} animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }} transition={{ duration: 0.8, delay: 0.2, ease: EXPO_OUT }}>
      <button className="pushable" onClick={onClick}>
        <span className="shadow"></span>
        <span className="edge"></span>
        <span className="front">
          join us
        </span>
      </button>
    </motion.div>
  );
}

// ─── KaraokeTitle ─────────────────────────────────────────────────────────────
function KaraokeTitle({ text, currentTime }) {
  const neonColors = [
    { color: "#ff00a0", shadow: "rgba(255, 0, 160, 0.8)" },
    { color: "#00e5ff", shadow: "rgba(0, 229, 255, 0.8)" },
    { color: "#e5ff00", shadow: "rgba(229, 255, 0, 0.8)" },
    { color: "#39ff14", shadow: "rgba(57, 255, 20, 0.8)" }
  ];
  const beat = Math.floor((currentTime || 0) * 2) % neonColors.length;
  const active = neonColors[beat];
  return (
    <>
      <style>{`
        @font-face {
          font-family: 'Mexcellent';
          src: url('/fonts/Mexcellent 3d.otf') format('opentype');
          font-weight: normal;
          font-style: normal;

        }
      `}</style>
      <SpringCharReveal text={text} style={{ fontSize: "10rem", fontWeight: 900, color: active.color, textTransform: "uppercase", letterSpacing: "0.02em", textAlign: "center", textShadow: `0 0 20px ${active.shadow}, 0 0 50px ${active.shadow}`, fontFamily: "'Mexcellent', sans-serif", transition: "color 0.15s ease, text-shadow 0.15s ease" }} />
    </>
  );
}

// ─── KineticMaskSequence ──────────────────────────────────────────────────────
function VariableStretchText({ scrollYProgress }) {
  const fontSize = useTransform(scrollYProgress, [0, 0.33], ["12vh", "60vh"]);
  const wdth = useTransform(scrollYProgress, [0, 0.33], [120, 20]);
  const fontVariationSettings = useMotionTemplate`"wdth" ${wdth}, "wght" 900`;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto+Flex:opsz,wdth,wght@8..144,25..151,100..1000&display=swap');
      `}</style>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", width: "100%", height: "100%", paddingBottom: "0vh" }}>
        <motion.div
          style={{
            fontFamily: "'Roboto Flex', sans-serif",
            textTransform: "uppercase",
            color: "#fff",
            fontSize,
            fontVariationSettings,
            textAlign: "center",
            whiteSpace: "nowrap",
            lineHeight: 0.85
          }}
        >
          HOW
        </motion.div>
        <motion.div
          style={{
            fontFamily: "'Roboto Flex', sans-serif",
            textTransform: "uppercase",
            color: "#fff",
            fontSize,
            fontVariationSettings,
            textAlign: "center",
            whiteSpace: "nowrap",
            lineHeight: 0.85
          }}
        >
          ABOUT
        </motion.div>
      </div>
    </>
  );
}

function KineticMaskSequence({ containerRef, currentTime }) {
  const targetRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: targetRef,
    container: containerRef,
    offset: ["start start", "end end"]
  });

  return (
    <div ref={targetRef} style={{ height: "300vh", width: "100%", position: "relative", zIndex: 10, background: "#000" }}>

      {/* 3 Snap points */}
      <div style={{ height: "100vh", width: "100%", scrollSnapAlign: "start", flexShrink: 0 }} />
      <div style={{ height: "100vh", width: "100%", scrollSnapAlign: "start", flexShrink: 0 }} />
      <div style={{ height: "100vh", width: "100%", scrollSnapAlign: "start", flexShrink: 0 }} />

      {/* WHITE BACKDROP (Reveals mask letters as white initially) */}
      <div style={{ position: "absolute", top: 0, height: "100vh", width: "100%", background: "#fff", zIndex: 0 }} />

      {/* KARAOKE PARENT */}
      <div style={{ position: "absolute", top: "100vh", height: "200vh", width: "100%", zIndex: 1 }}>
        <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden", background: "#000", display: "flex", justifyContent: "center", alignItems: "center" }}>
          <KaraokeTitle text="karaoke party !!!" currentTime={currentTime} />
        </div>
      </div>

      {/* MASK PARENT */}
      <div style={{ position: "absolute", top: 0, height: "200vh", width: "100%", zIndex: 10, pointerEvents: "none" }}>
        <div style={{
          position: "sticky", top: 0, height: "100vh",
          background: "#000", color: "#fff",
          mixBlendMode: "multiply"
        }}>
          <VariableStretchText scrollYProgress={scrollYProgress} />
        </div>
      </div>

    </div>
  );
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function getCoverForFile(filePath) {
  if (!filePath) return null;
  for (const groupKey in groupsData) {
    const group = groupsData[groupKey];
    if (group.albums && filePath.startsWith(group.basePath)) {
      const relativePath = filePath.substring(group.basePath.length);
      const albumId = relativePath.split('/')[0];
      for (const yearObj of group.albums) {
        if (yearObj.albums) {
          const album = yearObj.albums.find(a => String(a.id) === albumId);
          if (album && album.cover) return album.cover;
        }
      }
    }
  }
  return null;
}

// ─── CanvasMouseTail ────────────────────────────────────────────────────────
function CanvasMouseTail({ activeSection }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (activeSection !== 5 && activeSection !== 6 && activeSection !== 7) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;

    let particles = [];
    let mouse = { x: -1000, y: -1000 };

    const type = activeSection === 5 ? 'question' : 'confetti';

    class Particle {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.life = 1;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2 - 1;
        this.size = Math.random() * 15 + 15;
        this.angle = Math.random() * Math.PI * 2;
        this.va = (Math.random() - 0.5) * 0.2;
        if (type === 'confetti') {
          const colors = ['#ff4d85', '#ff9d00', '#ffea00', '#6200ea', '#00e5ff'];
          this.color = colors[Math.floor(Math.random() * colors.length)];
        } else {
          this.color = '#fff';
        }
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.05; // gravity
        this.angle += this.va;
        this.life -= 0.02;
      }
      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.globalAlpha = Math.max(0, this.life);

        if (type === 'question') {
          ctx.fillStyle = this.color;
          ctx.font = `bold ${this.size}px 'Clash Display', sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('?', 0, 0);
        } else {
          // confetti (rectangles)
          ctx.fillStyle = this.color;
          ctx.fillRect(-this.size / 4, -this.size / 4, this.size / 2, this.size / 2);
        }

        ctx.restore();
      }
    }

    let raf;
    const onMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      // Add particle on move
      particles.push(new Particle(mouse.x, mouse.y));
    };

    window.addEventListener('mousemove', onMouseMove);

    function loop() {
      ctx.clearRect(0, 0, W, H);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        p.draw();
        if (p.life <= 0) particles.splice(i, 1);
      }
      raf = requestAnimationFrame(loop);
    }
    loop();

    const onResize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
    };
  }, [activeSection]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999,
        opacity: (activeSection === 5 || activeSection === 6 || activeSection === 7) ? 1 : 0
      }}
    />
  );
}


// ─── HeroStars ───────────────────────────────────────────────────────────────
const HeroStars = ({ topHalfOnly = false }) => {
  const stars = useMemo(() => {
    return Array.from({ length: 150 }).map(() => ({
      x: Math.random() * 100,
      y: Math.random() * (topHalfOnly ? 50 : 100),
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.8 + 0.2,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 2
    }));
  }, [topHalfOnly]);

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none", overflow: "hidden" }}>
      {stars.map((s, i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute",
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            borderRadius: "50%",
            backgroundColor: "#fff",
          }}
          animate={{ opacity: [s.opacity, s.opacity * 0.2, s.opacity] }}
          transition={{ duration: s.duration, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
};

// ─── DissolveTransition ───────────────────────────────────────────────────────
function DissolveTransition({ containerRef, startVh = 11, endVh = 12 }) {
  const gridRef = useRef(null);
  const stateRef = useRef({ cells: [], cellEls: [], W: 0, H: 0, cols: 0, rows: 0 });

  const CELL = 16;
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@$%&*+=?!{}[]';
  const SPREAD_ABOVE = 0.28;
  const SPREAD_BELOW = 0.28;
  const SCATTER = 0.15;
  const SOLID_CORE = 0.03;
  const MIN_SCATTER_CENTER = 0.3;
  const VIS_THRESHOLD = 0.65;
  const COLOR = '#ffffff';

  function hash(r, c, s) {
    const raw = Math.sin(r * s + c * (s * 2.45)) * 43758.5453;
    return raw - Math.floor(raw);
  }

  function buildGrid() {
    const el = gridRef.current;
    if (!el) return;
    el.innerHTML = '';
    const W = window.innerWidth;
    const H = window.innerHeight;
    const cols = Math.ceil(W / CELL);
    const rows = Math.ceil(H / CELL);
    const cells = [];
    const cellEls = [];
    const fs = Math.round(CELL * 0.7);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const div = document.createElement('div');
        div.style.cssText = `
          position:absolute;left:${c * CELL}px;top:${r * CELL}px;
          width:${CELL}px;height:${CELL}px;
          background:${COLOR};visibility:hidden;
          display:flex;align-items:center;justify-content:center;
          color:#000;font-weight:600;font-family:monospace;overflow:hidden;
          font-size:${fs}px;
        `;
        div.textContent = CHARS[Math.floor(Math.random() * CHARS.length)];
        el.appendChild(div);
        cellEls.push(div);
        cells.push({
          ny: (r + 0.5) / rows,
          visRand: hash(r, c, 127.1),
          scatterOff: (hash(r, c, 269.3) - 0.5) * SCATTER,
        });
      }
    }
    stateRef.current = { cells, cellEls, W, H, cols, rows };
  }

  function hideAll() {
    stateRef.current.cellEls.forEach(el => el.style.visibility = 'hidden');
  }

  function updateBand(progress) {
    const { cells, cellEls } = stateRef.current;
    const TOTAL = 1 + SPREAD_ABOVE + SPREAD_BELOW;
    const bandCenterY = -SPREAD_ABOVE + progress * TOTAL;

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const rawDist = Math.abs(cell.ny - bandCenterY);
      const scatterStr = Math.max(MIN_SCATTER_CENTER, Math.min(1, rawDist / SOLID_CORE));
      const scattered = cell.ny - bandCenterY + cell.scatterOff * scatterStr;
      const normDist = scattered >= 0
        ? scattered / SPREAD_BELOW
        : Math.abs(scattered) / SPREAD_ABOVE;

      if (normDist >= 1) { cellEls[i].style.visibility = 'hidden'; continue; }
      const density = (1 - normDist) * (1 - normDist);
      cellEls[i].style.visibility =
        density > cell.visRand * VIS_THRESHOLD ? 'visible' : 'hidden';
    }
  }

  useEffect(() => {
    buildGrid();
    window.addEventListener('resize', buildGrid);
    return () => window.removeEventListener('resize', buildGrid);
  }, []);

  useEffect(() => {
    const container = containerRef?.current;
    if (!container) return;

    const onScroll = () => {
      const scrollTop = container.scrollTop;
      const vh = window.innerHeight;
      const triggerScrollStart = vh * startVh;
      const triggerScrollEnd = vh * endVh;
      const progress = Math.max(0, Math.min(1,
        (scrollTop - triggerScrollStart) / (triggerScrollEnd - triggerScrollStart)
      ));

      if (progress <= 0 || progress >= 1) {
        hideAll();
      } else {
        updateBand(progress);
      }
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [containerRef]);

  return (
    <div style={{ position: "sticky", top: 0, height: 0, width: "100%", zIndex: 60, overflow: "visible", pointerEvents: "none" }}>
      <div
        ref={gridRef}
        style={{
          position: 'absolute', top: 0, left: 0,
          width: '100vw', height: '100vh',
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FeaturesPage() {
  const navigate = useNavigate();

  const tracklist = [
    { num: "01", title: "Blood Sweat & Tears", file: "/btssongs/8/Blood Sweat & Tears.mp3", instrumentalFile: "/instrumentals/Blood Sweat & Tears_instrumental.mp3" },
    { num: "02", title: "Sugar Rush Ride", file: "/txtsongs/txt8/02. Sugar Rush Ride.mp3", instrumentalFile: "/instrumentals/02. Sugar Rush Ride_instrumental.mp3" },
    { num: "03", title: "Smart", file: "/lesongs/le5/04. Smart.mp3", instrumentalFile: "/instrumentals/04. Smart_instrumental.mp3" },
    { num: "04", title: "FAKE LOVE", file: "/btssongs/12/FAKE LOVE.mp3", instrumentalFile: "/instrumentals/FAKE LOVE_instrumental.mp3" },
    { num: "05", title: "HOT", file: "/lesongs/le7/02. HOT.mp3", instrumentalFile: "/instrumentals/02. HOT_instrumental.mp3" },
    { num: "06", title: "Do It Like That", file: "/txtsongs/txt9/09. Do It Like That.mp3", instrumentalFile: "/instrumentals/09. Do It Like That_instrumental.mp3" },
    { num: "07", title: "Perfect Night", file: "/lesongs/le4/01. Perfect Night.mp3", instrumentalFile: "/instrumentals/01. Perfect Night_instrumental.mp3" },
    { num: "08", title: "Dynamite", file: "/btssongs/15/Dynamite.mp3", instrumentalFile: "/instrumentals/Dynamite_instrumental.mp3" },
    { num: "09", title: "ANTIFRAGILE", file: "/lesongs/le3/05. ANTIFRAGILE.mp3", instrumentalFile: "/instrumentals/05. ANTIFRAGILE_instrumental.mp3" }
  ].map(t => ({ ...t, cover: getCoverForFile(t.file) || "/bts/bts1.jpg" }));

  const canvasRef = useRef(null);
  const heroRef = useRef(null);
  const standaloneContainerRef = useRef(null);
  const cardSectionRef = useRef(null);
  const [hasSelectedSong, setHasSelectedSong] = useState(false);
  const [currentAudio, setCurrentAudio] = useState(null);
  const currentAudioRef = useRef(null);
  const [activeTrack, setActiveTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const touchStartY = useRef(0);
  const [isKaraokeActive, setIsKaraokeActive] = useState(false);
  const openingSoundRef = useRef(null);
  const [isMuted, setIsMuted] = useState(GlobalMuteManager.isMuted);
  const [dissolveProgress, setDissolveProgress] = useState(0);
  const [dissolveProgress2, setDissolveProgress2] = useState(0);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [isPacmanHovered, setIsPacmanHovered] = useState(false);
  const [isPacmanGameActive, setIsPacmanGameActive] = useState(false);
  const [boxRect, setBoxRect] = useState(null);
  const [eatenLettersCount, setEatenLettersCount] = useState(0);
  const ctaVideoRef = useRef(null);
  const ctaHasPlayedRef = useRef(false);

  useEffect(() => {
    if (dissolveProgress2 > 0 && !ctaHasPlayedRef.current) {
      ctaHasPlayedRef.current = true;
      if (ctaVideoRef.current) {
        ctaVideoRef.current.currentTime = 0;
        ctaVideoRef.current.play().catch(() => { });
      }
    } else if (dissolveProgress2 === 0) {
      ctaHasPlayedRef.current = false;
    }
  }, [dissolveProgress2]);

  useEffect(() => {
    const handleMuteChange = (e) => setIsMuted(e.detail.isMuted);
    window.addEventListener('globalMuteChange', handleMuteChange);
    return () => window.removeEventListener('globalMuteChange', handleMuteChange);
  }, []);

  useEffect(() => {
    if (openingSoundRef.current) {
      openingSoundRef.current.setMuted(isMuted);
    }
    if (currentAudio) {
      currentAudio.muted = isMuted;
    }
  }, [isMuted, currentAudio]);

  useEffect(() => {
    if (!openingSoundRef.current) {
      openingSoundRef.current = new GaplessAudio('/soundeffects/opening_sound.mp3');
    }
    const opening = openingSoundRef.current;

    const tryPlay = () => {
      if (!activeTrack) {
        opening.volume = 0;
        opening.play()
          .then(() => {
            if (opening.fadeInterval) clearInterval(opening.fadeInterval);
            opening.fadeInterval = setInterval(() => {
              if (opening.volume < 0.95) opening.volume += 0.05;
              else { opening.volume = 1; clearInterval(opening.fadeInterval); }
            }, 50);
            document.removeEventListener('click', tryPlay);
            document.removeEventListener('scroll', tryPlay);
            document.removeEventListener('touchstart', tryPlay);
          })
          .catch(e => console.log("Waiting for interaction..."));
      }
    };

    if (!activeTrack) {
      opening.volume = 0;
      opening.play().then(() => {
        if (opening.fadeInterval) clearInterval(opening.fadeInterval);
        opening.fadeInterval = setInterval(() => {
          if (opening.volume < 0.95) opening.volume += 0.05;
          else { opening.volume = 1; clearInterval(opening.fadeInterval); }
        }, 50);
      }).catch(e => {
        document.addEventListener('click', tryPlay);
        document.addEventListener('scroll', tryPlay);
        document.addEventListener('touchstart', tryPlay);
      });
    } else {
      if (opening.fadeInterval) clearInterval(opening.fadeInterval);
      opening.fadeInterval = setInterval(() => {
        if (opening.volume > 0.05) opening.volume -= 0.05;
        else { opening.volume = 0; opening.pause(); clearInterval(opening.fadeInterval); }
      }, 50);
    }

    return () => {
      document.removeEventListener('click', tryPlay);
      document.removeEventListener('scroll', tryPlay);
      document.removeEventListener('touchstart', tryPlay);
    };
  }, [activeTrack]);

  const [heatmapSquares] = useState(() => {
    const squares = [];
    for (let col = 0; col < 24; col++) {
      for (let row = 0; row < 7; row++) {
        const rand = Math.random();
        let level = 0;
        if (rand > 0.80) level = 4;
        else if (rand > 0.60) level = 3;
        else if (rand > 0.40) level = 2;
        else if (rand > 0.20) level = 1;
        squares.push({ col, row, level });
      }
    }
    return squares;
  });

  useEffect(() => { currentAudioRef.current = currentAudio; }, [currentAudio]);
  useEffect(() => {
    return () => {
      if (currentAudioRef.current) currentAudioRef.current.pause();
    };
  }, []);

  const fadeOutAudio = useCallback((audio) => {
    if (!audio) return;
    if (audio.fadeInterval) clearInterval(audio.fadeInterval);
    audio.fadeInterval = setInterval(() => {
      if (audio.volume > 0.05) {
        audio.volume -= 0.05;
      } else {
        audio.volume = 0;
        audio.pause();
        clearInterval(audio.fadeInterval);
      }
    }, 50);
  }, []);

  const createAndPlayAudio = useCallback((fileUrl, startTime, track) => {
    const oldAudio = currentAudioRef.current;
    if (oldAudio) {
      fadeOutAudio(oldAudio);
    }

    const audio = new Audio(fileUrl);
    audio.muted = GlobalMuteManager.isMuted;
    audio.currentTime = startTime;
    audio.volume = 0;
    audio.play().catch(e => console.log("Audio play failed:", e));
    audio.loop = true;

    // Gapless loop hack
    audio.addEventListener('timeupdate', function () {
      if (this.duration && this.currentTime >= this.duration - 0.25) {
        this.currentTime = 0.05;
        this.play().catch(e => { });
      }
    });
    setCurrentAudio(audio);
    setIsPlaying(true);
    if (track) setActiveTrack(track);

    const fadeInStep = 0.05;
    audio.fadeInterval = setInterval(() => {
      if (audio.volume < 1 - fadeInStep) {
        audio.volume += fadeInStep;
      } else {
        audio.volume = 1;
        clearInterval(audio.fadeInterval);
      }
    }, 50);

    audio.addEventListener('pause', () => setIsPlaying(false));
    audio.addEventListener('play', () => setIsPlaying(true));
    audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));
  }, [fadeOutAudio]);

  const handlePlayTrack = useCallback((track) => {
    setHasSelectedSong(true);
    setIsKaraokeActive(false);
    createAndPlayAudio(track.file, 0, track);
  }, [createAndPlayAudio]);

  // Scroll hooks
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const { scrollYProgress: rawCardProgress } = useScroll({ target: cardSectionRef, offset: ["start start", "end end"] });
  const cardProgress = useTransform(rawCardProgress, [0, 0.6], [0, 1]);

  // Hero transforms
  const textScale = useTransform(heroProgress, [0, 0.85], [1, 120]);
  const textY = useTransform(heroProgress, [0, 0.85], [0, -300]);
  const glassOpacity = useTransform(heroProgress, [0.75, 0.95], [1, 0]);
  const blackOpacity = useTransform(heroProgress, [0.75, 0.95], [0, 1]);

  // Card transforms
  const cardWidth = useTransform(cardProgress, [0.2, 0.7], ["800px", "100vw"]);
  const cardHeight = useTransform(cardProgress, [0.2, 0.7], ["500px", "100vh"]);
  const cardRadius = useTransform(cardProgress, [0.2, 0.7], ["28px", "0px"]);
  const cardBorder = useTransform(cardProgress, [0.2, 0.7], ["1.5px", "0px"]);
  const cardShadowOpacity = useTransform(cardProgress, [0.2, 0.7], [1, 0]);

  const [hasScrolledHero, setHasScrolledHero] = useState(false);
  useMotionValueEvent(heroProgress, "change", (latest) => {
    if (latest > 0.02 && !hasScrolledHero) setHasScrolledHero(true);
    else if (latest <= 0.02 && hasScrolledHero) setHasScrolledHero(false);
  });

  // Album cover flow transforms — kept exactly as original
  const albumSpread = useTransform(cardProgress, [0.5, 0.7], [1, 2.2]);
  const sideAlbumScale = useTransform(cardProgress, [0.2, 0.55, 0.65], [1, 1.6, 0.001]);
  const sideAlbumPointer = useTransform(cardProgress, v => v > 0.6 ? "none" : "auto");
  const sideAlbumShadow = useTransform(cardProgress, [0.55, 0.65], [
    "0 20px 40px rgba(0,0,0,0.8), -10px 0 30px rgba(0,0,0,0.5)",
    "0 20px 40px rgba(0,0,0,0), -10px 0 30px rgba(0,0,0,0)"
  ]);
  const centerAlbumShadow = useTransform(cardProgress, [0.65, 0.75], [
    "0 30px 60px rgba(0,0,0,0.9)",
    "0 30px 60px rgba(0,0,0,0)"
  ]);
  const albumReflection = useTransform(cardProgress, [0.65, 0.75], [
    "below 2px linear-gradient(transparent, transparent 60%, rgba(255,255,255,0.2))",
    "below 2px linear-gradient(transparent, transparent 60%, rgba(255,255,255,0))"
  ]);
  // Center album stays centered (no X/Y shift) now that tracklist is bubbles
  const centerAlbumScale = useTransform(cardProgress, [0.2, 0.55, 0.8], [1, 1.6, 1.6]);

  // Bubbles fade in after cover flow exits
  const bubblesOpacity = useTransform(cardProgress, [0.82, 0.95], [0, 1]);
  const bubblesVisible = useTransform(cardProgress, v => v > 0.82);

  const [showBubbles, setShowBubbles] = useState(false);

  useMotionValueEvent(bubblesVisible, "change", (latest) => {
    setShowBubbles(latest);
  });

  const tracklistOpacity = useTransform(cardProgress, [0.85, 0.95], [0, 1]);

  useEffect(() => {
    if (canvasRef.current) {
      WebGLFluid(canvasRef.current, {
        TRIGGER: 'hover', IMMEDIATE: true, AUTO: false,
        SPLAT_RADIUS: 0.25, SPLAT_FORCE: 6000, BLOOM: true,
        BACK_COLOR: { r: 3, g: 3, b: 7 }, TRANSPARENT: false, DENSITY_DISSIPATION: 2.5
      });
    }
  }, []);

  return (
    <div className="fp-new-root">
      <CanvasMouseTail activeSection={activeSectionIndex} />
      <GlobalMuteButton />
      <canvas ref={canvasRef} className="fp-fluid-bg" />

      {/* ═══ SECTION 1: Hero zoom-through ═══ */}
      <div ref={heroRef} style={{ height: "300vh", position: "relative", pointerEvents: "none" }}>
        <motion.div style={{ position: "sticky", top: 0, height: "100vh", width: "100%", overflow: "hidden", pointerEvents: "none", opacity: glassOpacity }}>
          <HeroStars />
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 10, pointerEvents: "none" }}>
            <defs>
              <mask id="cutout-mask">
                <rect width="100%" height="100%" fill="white" />
                <HeroText textScale={textScale} textY={textY} />
              </mask>
            </defs>
            <foreignObject width="100%" height="100%" mask="url(#cutout-mask)">
              <div style={{ width: "100%", height: "100%", backdropFilter: "blur(100px)", WebkitBackdropFilter: "blur(100px)", background: "rgba(5, 5, 15, 0.88)" }} />
            </foreignObject>
          </svg>
          <motion.div style={{ position: "absolute", inset: 0, background: "rgba(5, 5, 15, 0.88)", zIndex: 15, opacity: blackOpacity }} />

          <AnimatePresence>
            {!hasScrolledHero && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10, transition: { duration: 0.3 } }}
                transition={{ delay: 1.5, duration: 1 }}
                style={{
                  position: "absolute",
                  bottom: "8%",
                  left: "50%",
                  x: "-50%",
                  zIndex: 20,
                  color: "#fff",
                  fontFamily: "'Clash Display', sans-serif",
                  fontSize: "0.9rem",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "8px",
                  pointerEvents: "none"
                }}
              >
                <span>Scroll to experience</span>
                <motion.div
                  animate={{ y: [0, 8, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M19 12l-7 7-7-7" />
                  </svg>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* ═══ SECTION 2: Mac Window — Cover Flow → Bubble Tracklist ═══ */}
      <div ref={cardSectionRef} style={{ height: "500vh", position: "relative", zIndex: 20 }}>
        <div style={{ position: "sticky", top: 0, height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(5, 5, 15, 0.88)", overflow: "hidden", zIndex: 20 }}>

          {/* Main Card */}
          <motion.div
            initial={false}
            animate={{ scale: activeTrack ? 0.82 : 1, opacity: activeTrack ? 0 : 1, filter: activeTrack ? "blur(20px)" : "blur(0px)", y: activeTrack ? 100 : 0 }}
            transition={{ duration: 0.85, ease: EXPO_OUT }}
            style={{ width: "100%", height: "100%", position: "absolute", display: "flex", justifyContent: "center", alignItems: "center" }}
          >
            <motion.div
              className="fp-mac-card"
              style={{
                width: cardWidth, height: cardHeight, borderRadius: cardRadius, borderWidth: cardBorder,
                boxShadow: useTransform(cardShadowOpacity, [0, 1], [
                  "0 0px 0px rgba(0,0,0,0), 0 0px 0px rgba(0,0,0,0), inset 0 0px 0 rgba(255,255,255,0)",
                  "0 24px 64px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)"
                ]),
                maxWidth: "100vw"
              }}
            >
              {/* Cover flow body */}
              <div className="fp-mac-body">
                {/* ── Cover Flow Albums (fade out as bubbles come in) ── */}
                <motion.div
                  className="fp-coverflow"
                  style={{ opacity: useTransform(cardProgress, [0.75, 0.88], [1, 0]), pointerEvents: useTransform(cardProgress, v => v > 0.82 ? "none" : "auto") }}
                >
                  <motion.div className="fp-album" style={{ x: useTransform(albumSpread, v => -160 * v), z: -150, rotateY: 45, scale: sideAlbumScale, pointerEvents: sideAlbumPointer, boxShadow: sideAlbumShadow, WebkitBoxReflect: albumReflection }}>
                    <img src="/le/le1.png" alt="LE SSERAFIM Album" />
                  </motion.div>
                  <motion.div className="fp-album" style={{ x: useTransform(albumSpread, v => -80 * v), z: -50, rotateY: 45, scale: sideAlbumScale, pointerEvents: sideAlbumPointer, boxShadow: sideAlbumShadow, WebkitBoxReflect: albumReflection }}>
                    <img src="/txt/txt1.jpg" alt="TXT Album" />
                  </motion.div>
                  <motion.div className="fp-album fp-album-center" style={{ z: 100, scale: centerAlbumScale, boxShadow: centerAlbumShadow, WebkitBoxReflect: albumReflection }}>
                    <img src="/hybe-logo.png" alt="HYBE" style={{ objectFit: 'contain' }} />
                  </motion.div>
                  <motion.div className="fp-album" style={{ x: useTransform(albumSpread, v => 80 * v), z: -50, rotateY: -45, scale: sideAlbumScale, pointerEvents: sideAlbumPointer, boxShadow: sideAlbumShadow, WebkitBoxReflect: albumReflection }}>
                    <img src="/bts/bts1.jpg" alt="BTS Album" />
                  </motion.div>
                  <motion.div className="fp-album" style={{ x: useTransform(albumSpread, v => 160 * v), z: -150, rotateY: -45, scale: sideAlbumScale, pointerEvents: sideAlbumPointer, boxShadow: sideAlbumShadow, WebkitBoxReflect: albumReflection }}>
                    <img src="/txt/txt2.jpg" alt="TXT Album" />
                  </motion.div>
                </motion.div>

                {/* ── Bubble Tracklist Layer ── */}
                <motion.div
                  style={{
                    position: "absolute", inset: 0,
                    pointerEvents: useTransform(cardProgress, v => v > 0.82 ? "auto" : "none")
                  }}
                >
                  {/* "Select a song" pill */}
                  <AnimatePresence>
                    {showBubbles && (
                      <motion.div
                        className="fp-song-popup"
                        initial={{ opacity: 0, y: -20, scale: 0.95, x: "-50%" }}
                        animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
                        exit={{ opacity: 0, scale: 0.8, filter: "blur(10px)", x: "-50%" }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                      >
                        Select a song
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Interactive HYBE particles */}
                  {!showBubbles && (
                    <motion.div
                      className="fp-bubble-center-album"
                      style={{ opacity: bubblesOpacity }}
                    >
                      <img src="/hybe-logo.png" alt="HYBE" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                    </motion.div>
                  )}
                  {showBubbles && <InteractiveImageParticles src="/hybe-logo.png" />}

                  {/* Bubbles */}
                  <BubbleTracklist
                    tracklist={tracklist}
                    onPlay={handlePlayTrack}
                    activeTrack={activeTrack}
                    visible={showBubbles}
                  />
                </motion.div>
              </div>
            </motion.div>
          </motion.div>

          {/* ── Standalone Player ── */}
          <AnimatePresence>
            {activeTrack && (
              <motion.div
                ref={standaloneContainerRef}
                className="maximized-overlay fp-standalone-player"
                initial={{ opacity: 0, y: 80 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 80, transition: { duration: 0.4 } }}
                transition={{ duration: 0.85, ease: EXPO_OUT }}
                onWheel={(e) => {
                  if (e.currentTarget.scrollTop === 0 && e.deltaY < 0) {
                    fadeOutAudio(currentAudioRef.current);
                    setActiveTrack(null);
                    setIsPlaying(false);
                  }
                }}
                onTouchStart={(e) => { touchStartY.current = e.touches[0].clientY; }}
                onTouchMove={(e) => {
                  if (e.currentTarget.scrollTop === 0) {
                    const deltaY = e.touches[0].clientY - touchStartY.current;
                    if (deltaY > 60) {
                      fadeOutAudio(currentAudioRef.current);
                      setActiveTrack(null);
                      setIsPlaying(false);
                    }
                  }
                }}
                onScroll={(e) => {
                  const scrollTop = e.currentTarget.scrollTop;
                  const vh = window.innerHeight;
                  const sectionIndex = Math.round(scrollTop / vh);
                  setActiveSectionIndex(sectionIndex);

                  // Dissolve progress (Section 8 is from 800vh to 1200vh)
                  const s8Start = vh * 11;
                  const s8End = vh * 12;
                  const dp = Math.max(0, Math.min(1, (scrollTop - s8Start) / (s8End - s8Start)));
                  setDissolveProgress(dp);

                  const s9Start = vh * 12;
                  const s9End = vh * 13;
                  const dp2 = Math.max(0, Math.min(1, (scrollTop - s9Start) / (s9End - s9Start)));
                  setDissolveProgress2(dp2);

                  // Karaoke instrumental should play during Karaoke (6) and Lyrics (7)
                  const shouldBeKaraoke = sectionIndex >= 6 && sectionIndex <= 7;

                  if (shouldBeKaraoke && !isKaraokeActive) {
                    setIsKaraokeActive(true);
                    const time = currentAudioRef.current?.currentTime || 0;
                    createAndPlayAudio(activeTrack.instrumentalFile || activeTrack.file.replace(".mp3", "_instrumental.mp3"), time);
                  } else if (!shouldBeKaraoke && isKaraokeActive) {
                    setIsKaraokeActive(false);
                    const time = currentAudioRef.current?.currentTime || 0;
                    createAndPlayAudio(activeTrack.file, time);
                  }

                  // Pop confetti ONLY when the Karaoke letters are fully revealed without the mask (Index 6)
                  if (sectionIndex === 6 && !window.karaokeConfettiPopped) {
                    confetti({ particleCount: 200, spread: 160, origin: { y: 0 }, gravity: 1.2, ticks: 300, colors: ['#000', '#fff', '#ff0055', '#00ffcc'] });
                    window.karaokeConfettiPopped = true;
                  } else if (sectionIndex < 6) {
                    window.karaokeConfettiPopped = false;
                  }
                }}
                style={{ position: "absolute", inset: 0, zIndex: 100, background: "transparent", animation: "none", overflowY: "auto", scrollSnapType: "y mandatory", scrollbarWidth: "none", willChange: "transform, opacity" }}
              >
                <div className="maximized-bg" style={{ position: "fixed", backgroundImage: activeTrack?.cover ? `url(${activeTrack.cover})` : 'none', backgroundColor: !activeTrack?.cover ? '#e5ff00' : undefined }} />
                <div className="maximized-bg-tint" style={{ position: "fixed", background: 'rgba(0,0,0,0.8)' }} />
                <div className="maximized-bg-vignette" style={{ position: "fixed" }} />
                <div className="maximized-bg-noise" style={{ position: "fixed" }} />
                <div className="maximized-bg-spotlight" style={{ position: "fixed" }} />

                <DissolveTransition containerRef={standaloneContainerRef} startVh={11} endVh={12} />
                <DissolveTransition containerRef={standaloneContainerRef} startVh={12} endVh={13} />

                <div style={{ position: "relative", width: "100%", zIndex: 10 }}>
                  <div style={{ position: "sticky", top: 0, height: "100vh", width: "100%", overflow: "hidden", zIndex: 5 }}>
                    <div className="vinyl-stage" style={{ transform: 'scale(1)', height: "100%", margin: 0, padding: 0 }}>
                      <div className="vinyl-unit">
                        <div className="vinyl-sleeve" style={!activeTrack?.cover ? { backgroundColor: '#e5ff00' } : {}}>
                          <img src={activeTrack?.cover || "/txt/txt1.jpg"} alt="Album sleeve" style={!activeTrack?.cover ? { display: 'none' } : {}} />
                        </div>
                        <div className="vinyl-platter" style={{ animation: 'none', transform: 'translateX(230px)' }}>
                          <div className={`vinyl-record ${isPlaying ? "spinning" : ""}`} style={{ "--cover-url": `url(${activeTrack?.cover || "/txt/txt1.jpg"})` }}>
                            <div className="vinyl-label">
                              <span className="label-song">{activeTrack?.title || "Track"}</span>
                              <span className="label-artist">{activeTrack?.artist || "HYBE"}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="tonearm-anchor">
                        <div className={`tonearm-wrap ${isPlaying ? "dropped" : ""}`}>
                          <div className="tonearm-base" /><div className="tonearm-arm" /><div className="tonearm-head" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: "-100vh", position: "relative", zIndex: 10 }}>
                    <div style={{ height: "100vh", width: "100%", scrollSnapAlign: "start", flexShrink: 0 }} />
                    <ScrollTransformingText containerRef={standaloneContainerRef} />
                  </div>
                </div>

                {/* SECTION 4: Lyrics */}
                <div className="fp-lyrics-wrapper" style={{ height: "100vh", width: "100%", flexShrink: 0, scrollSnapAlign: "start", position: "relative", zIndex: 10 }}>
                  <AudioContext.Provider value={{ audioRef: { current: currentAudio }, activeSong: { name: activeTrack?.title, cover: activeTrack?.cover, member: activeTrack?.artist }, albumData: { title: "Album", color: "#000", cover: activeTrack?.cover, member: activeTrack?.artist }, albumId: "local", currentTime, isPlaying, setIsPlaying: () => { }, playNext: () => { }, playPrev: () => { }, startKaraoke: () => { }, cancelKaraoke: () => { }, karaokeMode: false, shuffleMode: false, toggleShuffle: () => { }, repeatMode: 'off', cycleRepeat: () => { } }}>
                    <LyricsPanel onClose={() => { }} />
                  </AudioContext.Provider>
                </div>

                {/* SECTION 5 & 6: KINETIC MASK SEQUENCE */}
                <KineticMaskSequence containerRef={standaloneContainerRef} currentTime={currentTime} />

                {/* SECTION 7: Karaoke lyrics */}
                <div className="fp-lyrics-wrapper" style={{ height: "100vh", width: "100%", flexShrink: 0, scrollSnapAlign: "start", position: "relative", zIndex: 10 }}>
                  <AudioContext.Provider value={{ audioRef: { current: currentAudio }, activeSong: { name: activeTrack?.title, cover: activeTrack?.cover, member: activeTrack?.artist }, albumData: { title: "Album", color: "#000", cover: activeTrack?.cover, member: activeTrack?.artist }, albumId: "local", currentTime, isPlaying, setIsPlaying: () => { }, playNext: () => { }, playPrev: () => { }, startKaraoke: () => { }, cancelKaraoke: () => { }, karaokeMode: true, shuffleMode: false, toggleShuffle: () => { }, repeatMode: 'off', cycleRepeat: () => { } }}>
                    <LyricsPanel onClose={() => { }} hideSingers={true} />
                  </AudioContext.Provider>
                </div>

                {/* SECTION 8 & 9 & 10 WRAPPER: Overlapping 600vh block */}
                <div className="fp-section-8-wrapper" style={{ height: "600vh", width: "100%", flexShrink: 0, scrollSnapAlign: "start", position: "relative", zIndex: 20, background: "#000" }}>

                  {/* SECTION 8: 3D Grid */}
                  <div className="stuck-grid" style={{ position: "sticky", top: 0, height: "100vh", zIndex: 10, background: "#000" }}>
                    <h2 style={{ position: "absolute", zIndex: 10, fontSize: "10rem", fontWeight: 800, textAlign: "center", pointerEvents: "none", color: "#ffffffff", textShadow: "0 10px 30px rgba(0,0,0,0.8)", fontFamily: "'OffBit-DotBold', sans-serif", lineHeight: 1 }}>We wanna show<br /> your love<br />towards music</h2>
                    {["/bts/bts1.jpg", "/bts/bts2.jpg", "/bts/bts3.jpg", "/bts/bts4.jpg", "/bts/bts5.jpg", "/bts/bts6.jpg", "/bts/bts7.jpg", "/bts/bts8.jpg", "/bts/bts9.jpg", "/bts/bts10.jpg", "/bts/bts11.jpg", "/bts/bts12.jpg", "/bts/bts13.jpg", "/bts/bts14.jpg", "/bts/bts15.jpg", "/txt/txt1.jpg", "/txt/txt2.jpg", "/txt/txt3.jpg", "/txt/txt4.jpg", "/txt/txt5.jpg", "/txt/txt6.jpg", "/txt/txt7.png", "/txt/txt8.png", "/txt/txt9.jpg", "/txt/txt10.jpg", "/txt/txt11.jpg", "/txt/txt12.jpg", "/txt/txt13.png", "/le/le1.png", "/le/le2.png", "/le/le3.jpg", "/le/le4.jpg", "/le/le5.png", "/le/le6.jpg", "/le/le7.png", "/le/le8.jpg", "/le/le9.png", "/bts/promise.png", "/bts/stay_alive.png", "/bts/take_two.png"].map((src, i) => (
                      <div key={i} className="grid-item" style={{ backgroundImage: `url('${src}')`, backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: '0.5vmin', boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }} />
                    ))}
                  </div>

                  {/* SECTION 9: Heatmap */}
                  <div style={{
                    height: "100vh", width: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", position: "sticky", top: 0, marginTop: "200vh", zIndex: 20, background: "linear-gradient(135deg, #000000ff 0%, #12121a 100%)",
                    clipPath: `polygon(0% 0%, 100% 0%, 100% ${Math.max(0, Math.min(100, (-0.28 + dissolveProgress * 1.56) * 100))}%, 0% ${Math.max(0, Math.min(100, (-0.28 + dissolveProgress * 1.56) * 100))}%)`
                  }}>
                    <motion.div
                      style={{ position: "relative", zIndex: 1, marginBottom: "10vh", cursor: "pointer" }}
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: false, amount: 0.5 }}
                      transition={{ duration: 0.8, ease: EXPO_OUT, delay: 0.2 }}
                      className={`fp-heatmap-container ${isPacmanHovered && !isPacmanGameActive ? 'heatmap-glitch' : ''}`}
                      onMouseEnter={() => setIsPacmanHovered(true)}
                      onMouseLeave={() => setIsPacmanHovered(false)}
                      onClick={(e) => {
                        setBoxRect(e.currentTarget.getBoundingClientRect());
                        setIsPacmanGameActive(true);
                      }}
                    >
                      <AnimatePresence>
                        {isPacmanHovered && !isPacmanGameActive && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            style={{ position: "absolute", bottom: "-40px", right: "20px", display: "flex", alignItems: "center", gap: "10px", zIndex: 10 }}
                          >
                            <svg viewBox="0 0 14 14" style={{ width: "24px", height: "24px", fill: "#ffea00", shapeRendering: "crispEdges", animation: "pixelChomp 0.3s infinite" }}>
                              <path d="M5,0 h4 v1 h-4 z M3,1 h8 v1 h-8 z M2,2 h10 v1 h-10 z M1,3 h12 v1 h-12 z M1,4 h11 v1 h-11 z M0,5 h10 v1 h-10 z M0,6 h8 v1 h-8 z M0,7 h8 v1 h-8 z M0,8 h10 v1 h-10 z M1,9 h11 v1 h-11 z M1,10 h12 v1 h-12 z M2,11 h10 v1 h-10 z M3,12 h8 v1 h-8 z M5,13 h4 v1 h-4 z" />
                            </svg>
                            <span style={{ fontFamily: "'Upheaval', sans-serif", fontSize: "1.2rem", color: "#ffea00", textShadow: "0 0 10px rgba(255,234,0,0.5)", animation: "pulse 1s infinite" }}>PLAY</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <div className="fp-heatmap-wrapper">
                        <div className="fp-heatmap-y-axis"><span /><span>Mon</span><span /><span>Wed</span><span /><span>Fri</span><span /></div>
                        <div className="fp-heatmap-content">
                          <div className="fp-heatmap-x-axis">
                            <span style={{ gridColumn: 2 }}>Jan</span><span style={{ gridColumn: 6 }}>Feb</span><span style={{ gridColumn: 10 }}>Mar</span><span style={{ gridColumn: 15 }}>Apr</span><span style={{ gridColumn: 20 }}>May</span>
                          </div>
                          <div className="fp-heatmap-grid">
                            {heatmapSquares.map((sq, i) => (
                              <div key={i} className={`fp-heatmap-square ${sq.level > 0 ? 'fp-heatmap-active' : ''}`} style={{ gridColumn: sq.col + 1, gridRow: sq.row + 1, animationDelay: `${Math.random() * -10}s`, animationDuration: `${3 + Math.random() * 4}s` }} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    <div style={{ position: "relative", width: "100vw", textAlign: "center", marginBottom: "10vh", padding: "10px" }}>
                      <div style={{
                        position: "absolute",
                        left: `calc(${dissolveProgress2 * 100}% - 60px)`,
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: "120px",
                        height: "120px",
                        zIndex: 10,
                        opacity: dissolveProgress2 > 0 && dissolveProgress2 < 1 ? 1 : 0
                      }}>
                        {/* Pixel Pac-Man Open Mouth */}
                        <svg viewBox="0 0 14 14" style={{ width: "100%", height: "100%", fill: "#ffb800", shapeRendering: "crispEdges", position: "absolute", top: 0, left: 0 }}>
                          <path d="M5,0 h4 v1 h-4 z M3,1 h8 v1 h-8 z M2,2 h10 v1 h-10 z M1,3 h12 v1 h-12 z M1,4 h11 v1 h-11 z M0,5 h10 v1 h-10 z M0,6 h8 v1 h-8 z M0,7 h8 v1 h-8 z M0,8 h10 v1 h-10 z M1,9 h11 v1 h-11 z M1,10 h12 v1 h-12 z M2,11 h10 v1 h-10 z M3,12 h8 v1 h-8 z M5,13 h4 v1 h-4 z" />
                        </svg>
                        {/* Pixel Pac-Man Closed Mouth (Scroll driven) */}
                        <svg viewBox="0 0 14 14" style={{ width: "100%", height: "100%", fill: "#ffb800", shapeRendering: "crispEdges", position: "absolute", top: 0, left: 0, opacity: Math.floor(dissolveProgress2 * 40) % 2 === 0 ? 1 : 0 }}>
                          <path d="M5,0 h4 v1 h-4 z M3,1 h8 v1 h-8 z M2,2 h10 v1 h-10 z M1,3 h12 v1 h-12 z M1,4 h12 v1 h-12 z M0,5 h14 v4 h-14 z M1,9 h12 v1 h-12 z M1,10 h12 v1 h-12 z M2,11 h10 v1 h-10 z M3,12 h8 v1 h-8 z M5,13 h4 v1 h-4 z" />
                        </svg>
                      </div>

                      <div style={{
                        position: "relative", zIndex: 1, fontSize: "8rem", fontWeight: 800,
                        fontFamily: "'Upheaval', sans-serif",
                        background: "linear-gradient(90deg, #ff4d85, #ff9d00, #ffea00, #6200ea)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        whiteSpace: "nowrap",
                        clipPath: `polygon(${dissolveProgress2 * 100}% 0, 100% 0, 100% 100%, ${dissolveProgress2 * 100}% 100%)`
                      }}>
                        MUSICAL FOOTPRINT
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isPacmanGameActive && (
                      <PacmanPremium
                        heatmapSquares={heatmapSquares}
                        boxRect={boxRect}
                        onClose={() => setIsPacmanGameActive(false)}
                      />
                    )}
                  </AnimatePresence>

                  {/* SECTION 10: CTA */}
                  <div style={{
                    height: "100vh", width: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", position: "sticky", top: 0, zIndex: 30, background: "#000",
                    clipPath: `polygon(0% 0%, 100% 0%, 100% ${Math.max(0, Math.min(100, (-0.28 + dissolveProgress2 * 1.56) * 100))}%, 0% ${Math.max(0, Math.min(100, (-0.28 + dissolveProgress2 * 1.56) * 100))}%)`
                  }}>
                    <video
                      ref={ctaVideoRef}
                      src="/city_loop.mp4"
                      loop
                      muted
                      playsInline
                      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0, opacity: 0.6 }}
                    />
                    <HeroStars topHalfOnly={true} />
                    <div style={{ textAlign: "center", maxWidth: "800px", zIndex: 10, position: "relative" }}>
                      <WordReveal text="lets experience all in the FLOWY" stagger={0.07} style={{ fontSize: "4rem", fontWeight: 800, color: "#fff", marginBottom: "3rem", textShadow: "0 0 20px rgba(255,255,255,0.2)", fontFamily: "'Clash Display', sans-serif", lineHeight: 1.15 }} />
                    </div>
                    <CinematicCTA onClick={() => navigate("/")} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}