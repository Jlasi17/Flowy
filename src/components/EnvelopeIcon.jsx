import { useEffect, useRef } from "react";
import "./EnvelopeIcon.css";

export default function EnvelopeIcon() {
  const cardRef = useRef(null);
  const flapRef = useRef(null);
  const sealRef = useRef(null);
  const paRef = useRef(null);
  const pbRef = useRef(null);
  const pcRef = useRef(null);
  const rafRef = useRef(null);
  const running = useRef(true);

  useEffect(() => {
    const card = cardRef.current;
    const flap = flapRef.current;
    const seal = sealRef.current;
    const parts = [paRef.current, pbRef.current, pcRef.current];

    const FLY = [
      { x: -36, y: -72 },
      { x: 2, y: -94 },
      { x: 40, y: -78 },
    ];

    function snap(el, props) {
      el.style.transition = "none";
      Object.assign(el.style, props);
    }

    function anim(el, dur, ease, props) {
      el.style.transition = `transform ${dur}ms ${ease}, opacity ${dur}ms ${ease}`;
      Object.assign(el.style, props);
    }

    function wait(ms) {
      return new Promise((resolve) => {
        rafRef.current = setTimeout(resolve, ms);
      });
    }

    async function loop() {
      if (!running.current) return;

      // ── STATE 1: CLOSED ENVELOPE (INITIAL) ──
      snap(flap, { transform: "rotateX(0deg)" }); // closed
      snap(seal, { transform: "scale(1)", opacity: "1" });
      snap(card, { transform: "translateY(0px) rotate(0deg)", opacity: "0" });
      parts.forEach((p) => snap(p, { transform: "translate(0,0)", opacity: "1" }));

      await wait(1200);
      if (!running.current) return;

      // ── STEP 2: HEARTS FLY AWAY ──
      parts.forEach((p, i) => {
        setTimeout(() => {
          anim(p, 520, "ease-out", {
            transform: `translate(${ FLY[i].x }px, ${ FLY[i].y }px)`,
            opacity: "0",
          });
        }, i * 80);
      });

      await wait(700);
      if (!running.current) return;

      // ── STEP 3: REMOVE SEAL ──
      anim(seal, 300, "ease-in", {
        transform: "scale(0.5)",
        opacity: "0",
      });

      await wait(350);
      if (!running.current) return;

      // ── STEP 4: FLAP OPENS ──
      flap.style.transition = "transform 500ms cubic-bezier(.4,0,.2,1)";
      flap.style.transform = "rotateX(180deg)"; // OPEN

      await wait(550);
      if (!running.current) return;

      // ── STEP 5: LETTER COMES OUT ──
      snap(card, { transform: "translateY(0px)", opacity: "0" });

      await wait(20);

      card.style.transition =
        "transform 650ms cubic-bezier(.22,1,.36,1), opacity 300ms ease";
      card.style.transform = "translateY(-160px) rotate(8deg)";
      card.style.opacity = "1";

      await wait(800);
      if (!running.current) return;

      // ── STEP 6: LETTER GOES BACK ──
      card.style.transition =
        "transform 520ms cubic-bezier(.4,0,.2,1), opacity 250ms ease";
      card.style.transform = "translateY(0px) rotate(0deg)";

      await wait(300);
      card.style.opacity = "0";

      await wait(300);
      if (!running.current) return;

      // ── STEP 7: FLAP CLOSES ──
      flap.style.transition = "transform 480ms cubic-bezier(.4,0,.2,1)";
      flap.style.transform = "rotateX(0deg)"; // CLOSE

      await wait(400);
      if (!running.current) return;

      // ── STEP 8: SEAL RETURNS (BOUNCE) ──
      snap(seal, { transform: "scale(0)", opacity: "0" });

      await wait(20);

      seal.style.transition =
        "transform 400ms cubic-bezier(.22,1,.36,1), opacity 150ms ease";
      seal.style.transform = "scale(1.4)";
      seal.style.opacity = "1";

      await wait(180);

      seal.style.transition = "transform 200ms ease";
      seal.style.transform = "scale(1)";

      await wait(250);
      if (!running.current) return;

      // ── STEP 9: HEARTS COME BACK ──
      parts.forEach((p, i) =>
        snap(p, {
          transform: `translate(${ FLY[i].x }px, ${ FLY[i].y }px)`,
          opacity: "0",
        })
      );

      await wait(20);

      parts.forEach((p, i) => {
        setTimeout(() => {
          anim(p, 520, "cubic-bezier(.22,1,.36,1)", {
            transform: "translate(0,0)",
            opacity: "1",
          });
        }, i * 80);
      });

      await wait(700);
      if (!running.current) return;

      await wait(500);

      loop(); // LOOP AGAIN
    }

    loop();

    return () => {
      running.current = false;
      clearTimeout(rafRef.current);
    };
  }, []);

  return (
    <div className="env-wrapper">
      <svg
        className="env-svg"
        viewBox="0 0 260 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="envBg" x1="10" y1="130" x2="250" y2="295" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="100%" stopColor="#f0f0f0" />
          </linearGradient>
          <linearGradient id="lwG" x1="10" y1="165" x2="130" y2="295" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f0f0f0" />
            <stop offset="100%" stopColor="#e4e4e4" />
          </linearGradient>
          <linearGradient id="rwG" x1="130" y1="165" x2="250" y2="295" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#e8e8e8" />
            <stop offset="100%" stopColor="#f2f2f2" />
          </linearGradient>
          <linearGradient id="bfG" x1="130" y1="230" x2="130" y2="295" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#e8e8e8" />
            <stop offset="100%" stopColor="#dedede" />
          </linearGradient>
          <linearGradient id="flapG" x1="10" y1="130" x2="250" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f5f5f5" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
          <linearGradient id="cardG" x1="55" y1="30" x2="210" y2="190" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f9f9f9" />
          </linearGradient>
          <filter id="envSh">
            <feDropShadow dx="0" dy="6" stdDeviation="12" floodColor="#000" floodOpacity="0.10" />
          </filter>
          <filter id="cardSh">
            <feDropShadow dx="0" dy="4" stdDeviation="10" floodColor="#FF3B3B" floodOpacity="0.15" />
          </filter>
          <filter id="sealGlow">
            <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#FF3B3B" floodOpacity="0.5" />
          </filter>
          <clipPath id="envClip">
            <rect x="10" y="130" width="240" height="165" rx="14" />
          </clipPath>
        </defs>

        {/* Envelope body */}
        <rect x="10" y="130" width="240" height="165" rx="14" fill="url(#envBg)" filter="url(#envSh)" />

        {/* Inner X folds */}
        <polygon points="10,130 130,210 10,295" fill="url(#lwG)" clipPath="url(#envClip)" />
        <polygon points="250,130 130,210 250,295" fill="url(#rwG)" clipPath="url(#envClip)" />
        <polygon points="10,295 130,210 250,295" fill="url(#bfG)" clipPath="url(#envClip)" />
        <rect x="10" y="130" width="240" height="165" rx="14" fill="none" stroke="#ddd" strokeWidth="0.8" />

        {/* Letter card */}
        <g
          ref={cardRef}
          className="env-card"
          style={{ transformOrigin: "130px 215px" }}
        >
          <rect x="60" y="32" width="140" height="180" rx="8" fill="url(#cardG)" filter="url(#cardSh)" />
          <path
            d="M130,165 C130,165 90,138 90,110 C90,97.5 98.8,87 110,87 C117.5,87 124,91.5 130,99 C136,91.5 142.5,87 150,87 C161.2,87 170,97.5 170,110 C170,138 130,165 130,165Z"
            fill="#FF3B3B"
          />
        </g>

        {/* Flap */}
        <g
          ref={flapRef}
          className="env-flap"
          style={{ transformOrigin: "130px 130px" }}
        >
          <polygon points="10,130 130,55 250,130" fill="url(#flapG)" />
          <polygon points="10,130 130,55 250,130" fill="rgba(0,0,0,0.028)" />
          <polyline points="10,130 130,55 250,130" fill="none" stroke="#ddd" strokeWidth="0.9" strokeLinejoin="round" />
        </g>

        {/* Seal heart */}
        <g
          ref={sealRef}
          className="env-seal"
          style={{ transformOrigin: "130px 122px" }}
          filter="url(#sealGlow)"
        >
          <path
            d="M130,140 C130,140 113,129 113,118 C113,112 117.8,107 123.5,107 C126.8,107 129,109 130,110.2 C131,109 133.2,107 136.5,107 C142.2,107 147,112 147,118 C147,129 130,140 130,140Z"
            fill="#FF3B3B"
          />
        </g>

        {/* Particle hearts */}
        <g ref={paRef} className="env-particle">
          <path d="M96,108 C96,108 89,104 89,100 C89,97.8 90.6,96 92.8,96 C94,96 95,96.6 96,98 C97,96.6 98,96 99.2,96 C101.4,96 103,97.8 103,100 C103,104 96,108 96,108Z" fill="#FF5B5B" />
        </g>
        <g ref={pbRef} className="env-particle">
          <path d="M130,96 C130,96 123,92 123,88 C123,85.8 124.6,84 126.8,84 C128,84 129,84.6 130,86 C131,84.6 132,84 133.2,84 C135.4,84 137,85.8 137,88 C137,92 130,96 130,96Z" fill="#FF7070" />
        </g>
        <g ref={pcRef} className="env-particle">
          <path d="M164,104 C164,104 157,100 157,96 C157,93.8 158.6,92 160.8,92 C162,92 163,92.6 164,94 C165,92.6 166,92 167.2,92 C169.4,92 171,93.8 171,96 C171,100 164,104 164,104Z" fill="#FF4848" />
        </g>
      </svg>
    </div>
  );
}