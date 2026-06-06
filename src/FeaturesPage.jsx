import React, { useEffect, useRef } from "react";
import WebGLFluid from "webgl-fluid";
import { motion, useScroll, useTransform } from "framer-motion";
import "./FeaturesPage.css";

export default function FeaturesPage() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  // Scale the text up to 120x its size to literally enter the word
  const textScale = useTransform(scrollYProgress, [0, 0.85], [1, 120]);

  // Move text upward while scaling to simulate flying through
  const textY = useTransform(scrollYProgress, [0, 0.85], [0, -300]);

  // Fade out the frosted glass layer
  const glassOpacity = useTransform(scrollYProgress, [0.75, 0.95], [1, 0]);

  // Fade in pure black overlay
  const blackOpacity = useTransform(scrollYProgress, [0.75, 0.95], [0, 1]);

  useEffect(() => {
    if (canvasRef.current) {
      WebGLFluid(canvasRef.current, {
        TRIGGER: 'hover',
        IMMEDIATE: true,
        AUTO: false,
        SPLAT_RADIUS: 0.25,
        SPLAT_FORCE: 6000,
        BLOOM: true,
        BACK_COLOR: { r: 3, g: 3, b: 7 }, // matches #030307
        TRANSPARENT: false,
        DENSITY_DISSIPATION: 2.5
      });
    }
  }, []);

  return (
    <div className="fp-new-root">
      {/* Background stays completely fixed */}
      <canvas ref={canvasRef} className="fp-fluid-bg" />

      {/* The scrolling section that controls the zoom (300vh tall) */}
      <div ref={containerRef} style={{ height: "300vh", position: "relative", pointerEvents: "none" }}>

        {/* The sticky frame that stays pinned to the screen */}
        <motion.div
          style={{
            position: "sticky",
            top: 0,
            height: "100vh",
            width: "100%",
            overflow: "hidden",
            pointerEvents: "none",
            opacity: glassOpacity // Fades out at the very end
          }}
        >
          {/* SVG Mask Cutout over Frosted Glass */}
          <svg
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              zIndex: 10,
              pointerEvents: "none"
            }}
          >
            <defs>
              <mask id="cutout-mask">
                <rect width="100%" height="100%" fill="white" />
                {/* We scale ONLY the text inside the mask, zooming it towards the user */}
                <motion.g
                  style={{
                    transformOrigin: "50% 50%",
                    scale: textScale,
                    y: textY
                  }}
                >
                  <text x="50%" y="45%" textAnchor="middle" fill="black" fontSize="8vw" fontWeight="900" letterSpacing="-0.04em" fontFamily="Inter, sans-serif">
                    THE FUTURE OF
                  </text>
                  <text x="50%" y="56%" textAnchor="middle" fill="black" fontSize="8vw" fontWeight="900" letterSpacing="-0.04em" fontFamily="Inter, sans-serif">
                    MUSIC IS HEAR
                  </text>
                </motion.g>
              </mask>
            </defs>

            <foreignObject width="100%" height="100%" mask="url(#cutout-mask)">
              <div style={{
                width: "100%",
                height: "100%",
                backdropFilter: "blur(100px)",
                WebkitBackdropFilter: "blur(100px)",
                background: "rgba(5, 5, 15, 0.88)"
              }} />
            </foreignObject>
          </svg>

          {/* Fade overlay */}
          <motion.div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(5, 5, 15, 0.88)",
              zIndex: 15,
              opacity: blackOpacity
            }}
          />
        </motion.div>
      </div>

      {/* The next section (Dashboard) */}
      <div style={{ height: "100vh", background: "rgba(5, 5, 15, 0.88)", position: "relative", zIndex: 20 }}>
        {/* Next section content will go here */}
      </div>
    </div>
  );
}