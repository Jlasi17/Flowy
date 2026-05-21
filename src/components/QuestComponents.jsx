import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, useAnimation } from "framer-motion";

/* ──────────────────────────────────────────────────────
   UTILITIES
   ────────────────────────────────────────────────────── */
const getDarkerColor = (hex, amount = 40) => {
  if (!hex) return "#000000";
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * amount);
  const R = (num >> 16) - amt;
  const G = (num >> 8 & 0x00FF) - amt;
  const B = (num & 0x0000FF) - amt;
  return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
};

const RIDDLE_BODY =
  "I hid a song for you…\nNot where eyes can find it,\nbut where only devotion can reach.\n\nListen to every piece of me,\nand I will reveal what I could not say aloud.";

export const RED_SHADES = [
  "#ffd4d4", // 100
  "#ffadad", // 200
  "#ff8787", // 300
  "#ff5b5b", // 400
  "#ff0000", // 500
  "#dc0000", // 600
  "#ad0000", // 700
  "#7a0000", // 800
];
const RIBBON_PHRASES = [
  "WHAT IS YOUR LOVE SONG?",
  "MY LOVE SONG IS —",
  "I NEED U MY LOVE SONG IS",
  "ANSWER : LOVE MYSELF",
  "YOUR LOVE SONG IS MY LOVE",
  "WHAT IS YOUR LOVE SONG?",
  "MY LOVE SONG IS ANSWER",
  "I NEED U — LOVE MYSELF",
];

const RIDDLE_TAPE = [
  { text: "ON", rotate: -3.5, dx: -24, width: "160px", color: RED_SHADES[4] },
  { text: "WHAT IS", rotate: 1.2, dx: 18, width: "280px", color: RED_SHADES[5] },
  { text: "YOUR", rotate: -1.8, dx: -12, width: "200px", color: RED_SHADES[3] },
  { text: "LOVE", rotate: 0.8, dx: 14, width: "240px", color: RED_SHADES[6] },
  { text: "SONG?", rotate: -2.2, dx: -22, width: "260px", color: RED_SHADES[4] },
];
const CHAOTIC_RIBBONS = Array.from({ length: 16 }).map((_, i) => {
  const shade = RED_SHADES[i % RED_SHADES.length]; // cycles nicely

  return {
    text: RIBBON_PHRASES[i % RIBBON_PHRASES.length],
    top: Math.random() * 100,
    rotate: (Math.random() * 80) - 40,
    scale: 0.9 + Math.random() * 0.3,
    z: Math.floor(Math.random() * 10),
    color: shade,
  };
});

/* ──────────────────────────────────────────────────────
   ANIMATED ENVELOPE ICON
   ────────────────────────────────────────────────────── */
export function EnvelopeIcon({ onClick, albumColor = "#c41e1e" }) {
  const [stage, setStage] = useState("idle");
  // idle → seal → flap → letter → done

  const flapControls = useAnimation();
  const letterControls = useAnimation();
  const sealControls = useAnimation();

  const darker = getDarkerColor(albumColor, 30);
  const darkBody = getDarkerColor(albumColor, 50);
  const lightFlap = getDarkerColor(albumColor, -20);

  const startAnimation = async (e) => {
    e.stopPropagation();
    if (stage !== "idle") return;

    setStage("seal");

    // 1️⃣ Seal break
    await sealControls.start({
      scale: 1.3,
      rotate: 8,
      opacity: 0,
      transition: { duration: 0.35, ease: "easeOut" }
    });

    setStage("flap");

    // 2️⃣ Flap opens (slow + emotional)
    await flapControls.start({
      rotateX: 160,
      transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1] }
    });

    setStage("letter");

    // 3️⃣ Letter slides out
    await letterControls.start({
      y: -34,
      rotate: -3,
      transition: {
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1]
      }
    });

    setStage("done");

    // trigger modal after slight pause
    setTimeout(() => onClick(), 250);
  };

  return (
    <div
      onClick={startAnimation}
      style={{
        position: "relative",
        width: 56,
        height: 40,
        cursor: "pointer",
        perspective: "900px"
      }}
    >
      {/* Glow */}
      <div style={{
        position: "absolute",
        inset: -10,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${albumColor}55 0%, transparent 60%)`,
        animation: "pulseGlow 2s infinite alternate"
      }} />

      {/* Envelope Body */}
      <div style={{
        position: "relative",
        width: "100%",
        height: "100%",
        borderRadius: "0 0 6px 6px",
        background: `linear-gradient(145deg, ${albumColor}, ${getDarkerColor(albumColor, 25)})`,
        boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
        overflow: "hidden"
      }}>
        {/* Paper Texture */}
        <div style={{
          position: "absolute",
          inset: 0,
          opacity: 0.12,
          backgroundImage: "radial-gradient(rgba(0,0,0,0.2) 0.5px, transparent 0.5px)",
          backgroundSize: "3px 3px"
        }} />

        {/* Flap */}
        <motion.div
          initial={{ rotateX: 0 }}
          animate={flapControls}
          style={{
            position: "absolute",
            inset: 0,
            background: lightFlap,
            clipPath: "polygon(0 0, 100% 0, 50% 85%)",
            transformOrigin: "top",
            boxShadow: "inset 0 -8px 12px rgba(0,0,0,0.25)",
            zIndex: 5
          }}
        />

        {/* Letter */}
        <motion.div
          initial={{ y: 0, rotate: 0 }}
          animate={letterControls}
          style={{
            position: "absolute",
            top: 6,
            left: 6,
            width: "calc(100% - 12px)",
            height: "60%",
            background: "linear-gradient(to bottom, #fffaf3, #f3e6d8)",
            borderRadius: 3,
            boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
            zIndex: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transformOrigin: "bottom center"
          }}
        >
          <span style={{
            fontFamily: "'Caveat', cursive",
            fontSize: 12,
            color: "#b03a3a"
          }}>
            for you ♥
          </span>
        </motion.div>

        {/* Pocket */}
        <div style={{
          position: "absolute",
          inset: 0,
          clipPath: "polygon(0 40%, 50% 100%, 100% 40%, 100% 100%, 0 100%)",
          background: `linear-gradient(145deg, ${albumColor}, ${getDarkerColor(albumColor, 25)})`,
          zIndex: 6
        }} />

        {/* Wax Seal */}
        <motion.div
          initial={{ scale: 1, opacity: 1 }}
          animate={sealControls}
          style={{
            position: "absolute",
            bottom: 6,
            left: "50%",
            transform: "translateX(-50%)",
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: `radial-gradient(circle at 30% 30%, #ff6b6b, ${getDarkerColor(albumColor, 40)})`,
            boxShadow: "0 3px 8px rgba(0,0,0,0.4)",
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: '1px solid rgba(0,0,0,0.1)'
          }}
        >
          <span style={{ fontSize: 8, color: "#fff" }}>♥</span>
        </motion.div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────
   LETTER COVER (TORN TAPE VERSION)
   ────────────────────────────────────────────────────── */
/* ──────────────────────────────────────────────────────
   ART GALLERY SYMBOL (QUEST ENTRY)
   ────────────────────────────────────────────────────── */
export function ArtGallerySymbol({ size = 26, style = {}, onMouseEnter, onMouseLeave, onClick }) {
  return (
    <button 
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'relative',
        display: 'flex', 
        alignItems: 'center', 
        gap: '14px',
        padding: '12px 24px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 1000,
        ...style
      }}
    >
      {/* Background Tape Piece */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: RED_SHADES[4],
        clipPath: 'polygon(1% 10%, 99% 0%, 97% 90%, 3% 100%)',
        boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
        zIndex: -1,
        transition: 'all 0.3s ease',
        borderTop: '1px solid rgba(255,255,255,0.2)',
        borderBottom: '1px solid rgba(0,0,0,0.2)'
      }} />

      {/* SVG Icon */}
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 256 253" 
        fill="white"
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
      >
        <path d="M146.142,143.991c0-4.774,3.903-8.677,8.677-8.677s8.677,3.903,8.677,8.677s-3.827,8.677-8.677,8.677
	C150.007,152.668,146.142,148.766,146.142,143.991z M177,122v86l-98-0.038V122H177z M171,128H85v62.671l25.991-49.599l17.718,36.375
	l18.604-11.632L171,188.36V128z M2,69c0,13.678,9.625,25.302,22,29.576V233H2v18h252v-18h-22V98.554
	c12.89-3.945,21.699-15.396,22-29.554v-8H2V69z M65.29,68.346c0,6.477,6.755,31.47,31.727,31.47
	c21.689,0,31.202-19.615,31.202-31.47c0,11.052,7.41,31.447,31.464,31.447c21.733,0,31.363-20.999,31.363-31.447
	c0,14.425,9.726,26.416,22.954,30.154V233H42V98.594C55.402,94.966,65.29,82.895,65.29,68.346z M222.832,22H223V2H34v20L2,54h252
	L222.832,22z"/>
      </svg>

      {/* Label */}
      <span style={{
        color: 'white',
        fontFamily: "'Arial Black', sans-serif",
        fontSize: '11px',
        fontWeight: 900,
        letterSpacing: '3px',
        textTransform: 'uppercase',
        userSelect: 'none',
        textShadow: '0 2px 4px rgba(0,0,0,0.3)'
      }}>
        The Gallery
      </span>
      
      {/* Paper Grain Overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.12,
        backgroundImage: "radial-gradient(rgba(0,0,0,0.4) 0.5px, transparent 0.5px)",
        backgroundSize: "3px 3px",
        pointerEvents: "none"
      }} />
    </button>
  );
}

function LetterCover({ onOpen, albumColor = "#c41e1e" }) {
  const [opening, setOpening] = useState(false);
  const darker = getDarkerColor(albumColor, 30);
  const lighter = getDarkerColor(albumColor, -20);

  const handleClick = () => {
    if (opening) return;
    setOpening(true);
    setTimeout(() => onOpen(), 760);
  };

  const ANGLES = [-42, -26, -14, 6, 19, 34, 50, -56];
  const YTOPS = [7, 21, 35, 49, 62, 74, 86, 14];
  const REDS = [
    RED_SHADES[4], RED_SHADES[5], RED_SHADES[2],
    RED_SHADES[6], RED_SHADES[3], RED_SHADES[4], RED_SHADES[7], RED_SHADES[5],
  ];

  // Helper for jagged torn edges
  const getTornClip = () => {
    const points = [];
    points.push("0% 5%");
    for (let i = 1; i < 20; i++) points.push(`${i * 5}% ${Math.random() * 6}%`);
    points.push("100% 5%", "100% 95%");
    for (let i = 19; i > 0; i--) points.push(`${i * 5}% ${94 + Math.random() * 6}%`);
    points.push("0% 95%");
    return `polygon(${points.join(",")})`;
  };

  const tapeClips = useMemo(() => RIDDLE_TAPE.map(() => getTornClip()), []);
  const qrClip = useMemo(() => getTornClip(), []);
  const scrapClips = useMemo(() => [getTornClip(), getTornClip()], []);

  return (
    <div
      onClick={handleClick}
      style={{
        position: "absolute", inset: 0,
        background: "#fff",
        borderRadius: "inherit",
        overflow: "hidden",
        cursor: "pointer",
        zIndex: 10,
        transformOrigin: "bottom center",
        transform: opening
          ? "perspective(900px) rotateX(-95deg) scaleY(0.04)"
          : "perspective(900px) rotateX(0deg) scaleY(1)",
        opacity: opening ? 0 : 1,
        transition: opening
          ? "transform 0.72s cubic-bezier(0.4,0,0.2,1), opacity 0.55s ease 0.12s"
          : "none",
      }}
    >
      {/* Background Ribbons */}
      {CHAOTIC_RIBBONS.map((r, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: "-20%",
            width: "140%",
            top: `${r.top}%`,
            transform: `rotate(${r.rotate}deg) scale(${r.scale})`,
            background: `linear-gradient(
  to bottom,
  ${r.color},
  ${getDarkerColor(r.color, 20)}
)`, opacity: 0.85 + Math.random() * 0.15, borderTop: "1px solid rgba(255,255,255,0.25)",
            borderBottom: "1px solid rgba(0,0,0,0.25)",
            padding: "10px 0",
            zIndex: r.z,
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
            overflow: "hidden",
            whiteSpace: "nowrap",
            mixBlendMode: "multiply",
          }}
        >
          <span
            style={{
              fontFamily: "'Arial Black','Helvetica Neue',sans-serif",
              fontWeight: 900,
              fontSize: "12px",
              letterSpacing: "3px",
              color: "rgba(255,255,255,0.9)",
              textTransform: "uppercase",
              userSelect: "none",
            }}
          >
            {Array(12).fill(r.text + "   ").join("")}
          </span>
        </div>
      ))}

      {/* Main Riddle Tape Pieces */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "flex-start", justifyContent: "center",
        zIndex: 20, gap: 8, pointerEvents: "none",
        paddingLeft: "40px"
      }}>
        {RIDDLE_TAPE.map((line, i) => (
          <div key={i} style={{
            background: line.color || RED_SHADES[4],
            width: line.width,
            padding: "8px 24px",
            transform: `rotate(${line.rotate}deg) translateX(${line.dx}px)`,
            boxShadow: "0 3px 12px rgba(0,0,0,0.3)",
            clipPath: tapeClips[i],

            display: "flex", alignItems: "center",
          }}>
            <span style={{
              fontFamily: "'Arial Black', Impact, sans-serif",
              fontWeight: 900,
              fontSize: "clamp(24px, 6vw, 36px)",
              color: "#0a0a0a", // High contrast black
              letterSpacing: "-0.5px",
              whiteSpace: "nowrap",
            }}>{line.text}</span>
          </div>
        ))}


      </div>

      {/* Scrap Tape Pieces on the Right */}


      <div style={{
        position: "absolute", bottom: 18,
        left: 0, right: 0, textAlign: "center", zIndex: 25,
        animation: "coverHint 2s ease-in-out infinite alternate",
      }}>
        <span style={{
          fontFamily: "'Arial Black',sans-serif",
          fontSize: "9px", letterSpacing: "3px",
          color: "rgba(0, 0, 0, 0.77)", textTransform: "uppercase",
        }}>▼ TAP TO OPEN ▼</span>
      </div>
    </div>
  );
}


/* ──────────────────────────────────────────────────────
   QUEST MODAL
   ────────────────────────────────────────────────────── */
export function QuestModal({ onAccept, onDecline, onClose, albumColor = "#c41e1e" }) {
  const [flipped, setFlipped] = useState(false);
  const [shownLines, setShownLines] = useState([]);
  const [ctaReady, setCtaReady] = useState(false);
  const bodyLines = RIDDLE_BODY.split("\n");
  const darker = getDarkerColor(albumColor, 30);

  const handleFlip = () => {
    if (flipped) return;
    setFlipped(true);
    // Start revealing text after flip finishes
    setTimeout(() => {
      bodyLines.forEach((_, i) => {
        setTimeout(() => {
          setShownLines(prev => [...prev, i]);
          if (i === bodyLines.length - 1) setTimeout(() => setCtaReady(true), 320);
        }, i * 195);
      });
    }, 600);
  };

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(3,1,1,0.91)",
        backdropFilter: "blur(18px)",
        animation: "mBackdrop 0.35s ease forwards",
      }}
    >
      <motion.div
        initial={false}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        style={{
          position: "relative",
          width: "min(430px,93vw)",
          height: 520,
          transformStyle: "preserve-3d",
          cursor: "pointer",
        }}
      >
        {/* FRONT: The Tape Cover */}
        <div style={{
          position: "absolute", inset: 0,
          backfaceVisibility: "hidden",
          borderRadius: 3,
          overflow: "hidden",
          boxShadow: "0 40px 110px rgba(0,0,0,0.88)",
        }}>
          <LetterCover onOpen={handleFlip} albumColor={albumColor} />

          {/* Scanline Overlay (Fixed Syntax) */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 1px, transparent 1px, transparent 3px)",
              opacity: 0.4,
              pointerEvents: "none",
              zIndex: 30,
              filter: `blur(${Math.random() * 0.5}px)`,
            }}
          />
        </div>

        {/* BACK: The Letter */}
        <div style={{
          position: "absolute", inset: 0,
          backfaceVisibility: "hidden",
          transform: "rotateY(180deg)",
          borderRadius: 3,
          overflow: "hidden",
          background: "#faf3ec",
          boxShadow: "0 40px 110px rgba(0,0,0,0.88)",
          padding: "54px 46px 44px",
          display: "flex", flexDirection: "column",
        }}>
          <div style={{
            position: "absolute", inset: 0,
            background: `linear-gradient(160deg, #faf3ec 0%, #f0e8de 100%)`,
            zIndex: -1
          }} />

          {Array.from({ length: 22 }).map((_, i) => (
            <div key={i} style={{
              position: "absolute", left: 0, right: 0,
              top: `${(i + 1) * 4.5}%`, height: 1,
              background: "rgba(139,80,60,0.07)",
              pointerEvents: "none",
            }} />
          ))}

          <div style={{
            position: "absolute", top: 0, left: "-5%",
            width: "110%", height: 20,
            background: albumColor,
            transform: "rotate(-1.2deg)",
          }} />

          <div style={{
            position: "absolute", top: 14, right: 20,
            width: 34, height: 34, borderRadius: "50%",
            background: `radial-gradient(circle at 35% 35%, #d4a843cc, ${darker})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 2px 10px ${darker}99`,
            fontSize: 14, userSelect: "none",
          }}>♥</div>

          <p style={{
            fontFamily: "'Georgia',serif",
            fontSize: "10px", letterSpacing: "3px",
            color: "#a08070", textTransform: "uppercase",
            marginBottom: 26, marginTop: 14,
          }}>
            For the one who listens —
          </p>

          <div style={{
            flex: 1,
            fontFamily: "'Georgia','Times New Roman',serif",
            fontSize: "clamp(14px,3.5vw,17px)",
            lineHeight: 1.95, color: "#1a0a0a",
          }}>
            {bodyLines.map((line, i) => (
              <div key={i} style={{
                opacity: shownLines.includes(i) ? 1 : 0,
                transform: shownLines.includes(i) ? "translateY(0)" : "translateY(10px)",
                transition: "opacity 0.55s ease, transform 0.55s ease",
                minHeight: line === "" ? "0.9em" : "auto",
              }}>
                {line || "\u00A0"}
              </div>
            ))}
          </div>

          {ctaReady && (
            <div style={{
              display: "flex", gap: 14, marginTop: 34,
              animation: "mFadeUp 0.45s ease both",
            }}>
              <button
                onClick={onAccept}
                style={{
                  flex: 1,
                  background: RED_SHADES[4], color: "#fff",
                  border: "none", padding: "15px 0",
                  fontFamily: "'Arial Black',sans-serif",
                  fontSize: "11px", fontWeight: 900,
                  letterSpacing: "3.5px", textTransform: "uppercase",
                  cursor: "pointer",
                  boxShadow: `0 4px 24px ${RED_SHADES[4]}55`,
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = getDarkerColor(RED_SHADES[4], 20);
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = `0 8px 32px ${RED_SHADES[4]}77`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = RED_SHADES[4];
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = `0 4px 24px ${RED_SHADES[4]}55`;
                }}
              >
                BEGIN QUEST
              </button>
              <button
                onClick={onDecline}
                style={{
                  padding: "15px 22px",
                  background: "transparent", color: "#999",
                  border: "1px solid rgba(0,0,0,0.18)",
                  fontFamily: "'Arial Black',sans-serif",
                  fontSize: "10px", fontWeight: 900,
                  letterSpacing: "2px", textTransform: "uppercase",
                  cursor: "pointer", transition: "color 0.2s",
                }}
                onMouseEnter={e => e.currentTarget.style.color = "#333"}
                onMouseLeave={e => e.currentTarget.style.color = "#999"}
              >
                NOT NOW
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────
   QUEST ACTIVE BANNER
   ────────────────────────────────────────────────────── */
export function QuestBanner({ played, total, albumColor = "#c41e1e", onQuit }) {
  const pct = Math.min(played / total, 1);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 16px", marginBottom: 20,
      background: `${albumColor}12`,
      border: `1px solid ${albumColor}30`,
      borderRadius: 4,
      animation: "bFadeUp 0.4s ease both",
    }}>
      <span style={{ fontSize: 16 }}>🕯️</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{
            fontFamily: "'Arial Black',sans-serif", fontSize: "9px",
            letterSpacing: "2.5px", textTransform: "uppercase",
            color: albumColor,
          }}>QUEST ACTIVE</span>
          <span style={{
            fontFamily: "'Arial Black',sans-serif", fontSize: "9px",
            color: "rgba(255,255,255,0.4)", letterSpacing: "1px",
          }}>{played} / {total} TRACKS</span>
        </div>
        <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${pct * 100}%`,
            background: `linear-gradient(90deg, ${albumColor}, #fff)`,
            borderRadius: 2,
            transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
            boxShadow: `0 0 8px ${albumColor}88`,
          }} />
        </div>
      </div>

      {onQuit && (
        <button
          onClick={onQuit}
          style={{
            marginLeft: 8,
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.4)",
            padding: "6px 10px",
            borderRadius: 3,
            fontFamily: "'Arial Black',sans-serif",
            fontSize: "8px",
            letterSpacing: "1px",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = "#fff";
            e.currentTarget.style.borderColor = albumColor;
            e.currentTarget.style.background = `${albumColor}22`;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = "rgba(255,255,255,0.4)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
            e.currentTarget.style.background = "transparent";
          }}
        >
          QUIT
        </button>
      )}
    </div>
  );
}
