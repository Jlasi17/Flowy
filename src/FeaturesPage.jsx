import React, { useEffect, useRef, useState } from "react";
import WebGLFluid from "webgl-fluid";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import LyricsPanel from "./components/LyricsPanel";
import { AudioContext } from "./AudioPlayerProvider";
import confetti from "canvas-confetti";
import groupsData from "./data/musicRegistry";
import "./FeaturesPage.css";

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
  const cardSectionRef = useRef(null);
  const [hasSelectedSong, setHasSelectedSong] = useState(false);
  const [currentAudio, setCurrentAudio] = useState(null);
  const currentAudioRef = useRef(null); // Ref to avoid stale closures in scroll handlers
  const [activeTrack, setActiveTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [heatmapSquares] = useState(() => {
    const squares = [];
    for (let col = 0; col < 24; col++) {
      for (let row = 0; row < 7; row++) {
        const rand = Math.random();
        let level = 0;
        if (rand > 0.80) level = 4; // 20% Purple
        else if (rand > 0.60) level = 3; // 20% Yellow
        else if (rand > 0.40) level = 2; // 20% Orange
        else if (rand > 0.20) level = 1; // 20% Pink
        // Only 20% stay black/empty
        squares.push({ col, row, level });
      }
    }
    return squares;
  });
  const [isKaraokeActive, setIsKaraokeActive] = useState(false);
  const touchStartY = useRef(0);

  // Sync ref with state
  useEffect(() => {
    currentAudioRef.current = currentAudio;
  }, [currentAudio]);

  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
      }
    };
  }, [currentAudio]);

  const createAndPlayAudio = (fileUrl, startTime, track) => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    }
    const audio = new Audio(fileUrl);
    audio.currentTime = startTime;
    audio.play().catch(e => console.log("Audio play failed:", e));
    audio.loop = true;

    setCurrentAudio(audio);
    setIsPlaying(true);
    if (track) setActiveTrack(track);

    audio.addEventListener('pause', () => setIsPlaying(false));
    audio.addEventListener('play', () => setIsPlaying(true));
    audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));
  };

  const handlePlayTrack = (track) => {
    setHasSelectedSong(true);
    setIsKaraokeActive(false);
    createAndPlayAudio(track.file, 0, track);
  };

  // Hero zoom-through scroll
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  // Card expansion scroll
  const { scrollYProgress: rawCardProgress } = useScroll({
    target: cardSectionRef,
    offset: ["start start", "end end"]
  });

  // Compress the entire animation into the first 60% of the container.
  // The remaining 40% (200vh) acts as a buffer where the tracklist stays frozen on screen.
  const cardProgress = useTransform(rawCardProgress, [0, 0.6], [0, 1]);

  // ── Hero text zoom ──
  const textScale = useTransform(heroProgress, [0, 0.85], [1, 120]);
  const textY = useTransform(heroProgress, [0, 0.85], [0, -300]);
  const glassOpacity = useTransform(heroProgress, [0.75, 0.95], [1, 0]);
  const blackOpacity = useTransform(heroProgress, [0.75, 0.95], [0, 1]);

  // ── Card expansion (delayed: 20%–70% of scroll) ──
  const cardWidth = useTransform(cardProgress, [0.2, 0.7], ["800px", "100vw"]);
  const cardHeight = useTransform(cardProgress, [0.2, 0.7], ["500px", "100vh"]);
  const cardRadius = useTransform(cardProgress, [0.2, 0.7], ["28px", "0px"]);
  const cardBorder = useTransform(cardProgress, [0.2, 0.7], ["1.5px", "0px"]);
  const cardShadowOpacity = useTransform(cardProgress, [0.2, 0.7], [1, 0]);

  // ── Album covers grow as card expands ──
  const albumSpread = useTransform(cardProgress, [0.5, 0.7], [1, 2.2]);

  // ── Step 1: Side albums shrink into nothingness (55% - 65%) ──
  const sideAlbumScale = useTransform(cardProgress, [0.2, 0.55, 0.65], [1, 1.6, 0.001]);
  const sideAlbumPointer = useTransform(cardProgress, v => v > 0.6 ? "none" : "auto");

  // ── Shadows & Reflections fade out (65% - 75%) ──
  const sideAlbumShadow = useTransform(cardProgress, [0.55, 0.65], ["0 20px 40px rgba(0, 0, 0, 0.8), -10px 0 30px rgba(0,0,0,0.5)", "0 20px 40px rgba(0, 0, 0, 0), -10px 0 30px rgba(0,0,0,0)"]);
  const centerAlbumShadow = useTransform(cardProgress, [0.65, 0.75], ["0 30px 60px rgba(0, 0, 0, 0.9)", "0 30px 60px rgba(0, 0, 0, 0)"]);
  const albumReflection = useTransform(cardProgress, [0.65, 0.75], [
    "below 2px linear-gradient(transparent, transparent 60%, rgba(255,255,255,0.2))",
    "below 2px linear-gradient(transparent, transparent 60%, rgba(255,255,255,0))"
  ]);

  // ── Step 2: Center album moves to top-left (70% - 80%) ──
  const centerAlbumX = useTransform(cardProgress, [0.7, 0.8], ["0vw", "-25vw"]);
  const centerAlbumY = useTransform(cardProgress, [0.7, 0.8], ["0vh", "-10vh"]);
  const centerAlbumScale = useTransform(cardProgress, [0.2, 0.55, 0.8], [1, 1.6, 2]);

  // ── Step 3: Tracklist reveals (85%–95%) ──
  const tracklistOpacity = useTransform(cardProgress, [0.85, 0.95], [0, 1]);
  const tracklistY = useTransform(cardProgress, [0.85, 0.95], [40, 0]);

  // ── Mac title bar fades out as card goes fullscreen ──
  const headerOpacity = useTransform(cardProgress, [0.5, 0.7], [1, 0]);

  useEffect(() => {
    if (canvasRef.current) {
      WebGLFluid(canvasRef.current, {
        TRIGGER: 'hover',
        IMMEDIATE: true,
        AUTO: false,
        SPLAT_RADIUS: 0.25,
        SPLAT_FORCE: 6000,
        BLOOM: true,
        BACK_COLOR: { r: 3, g: 3, b: 7 },
        TRANSPARENT: false,
        DENSITY_DISSIPATION: 2.5
      });
    }
  }, []);

  return (
    <div className="fp-new-root">
      {/* Fixed WebGL fluid background */}
      <canvas ref={canvasRef} className="fp-fluid-bg" />

      {/* ═══ SECTION 1: Hero zoom-through ═══ */}
      <div ref={heroRef} style={{ height: "300vh", position: "relative", pointerEvents: "none" }}>
        <motion.div
          style={{
            position: "sticky",
            top: 0,
            height: "100vh",
            width: "100%",
            overflow: "hidden",
            pointerEvents: "none",
            opacity: glassOpacity
          }}
        >
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

      {/* ═══ SECTION 2: The Mac Window & Cover Flow ═══ */}
      <div ref={cardSectionRef} style={{ height: "500vh", position: "relative", zIndex: 20 }}>
        <div
          style={{
            position: "sticky",
            top: 0,
            height: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(5, 5, 15, 0.88)",
            overflow: "hidden",
            zIndex: 20
          }}
        >
          {/* Main Card (shrinks on play for genie effect) */}
          <motion.div
            initial={false}
            animate={{
              scale: activeTrack ? 0.8 : 1,
              opacity: activeTrack ? 0 : 1,
              filter: activeTrack ? "blur(20px)" : "blur(0px)",
              y: activeTrack ? 100 : 0
            }}
            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
            style={{ width: "100%", height: "100%", position: "absolute", display: "flex", justifyContent: "center", alignItems: "center" }}
          >
            <motion.div
              className="fp-mac-card"
              style={{
                width: cardWidth,
                height: cardHeight,
                borderRadius: cardRadius,
                borderWidth: cardBorder,
                boxShadow: useTransform(
                  cardShadowOpacity,
                  [0, 1],
                  [
                    "0 0px 0px rgba(0,0,0,0), 0 0px 0px rgba(0,0,0,0), inset 0 0px 0 rgba(255,255,255,0)",
                    "0 24px 64px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)"
                  ]
                ),
                maxWidth: "100vw"
              }}
            >

              {/* Cover flow body */}
              <div className="fp-mac-body">
                <div className="fp-coverflow">
                  <motion.div className="fp-album" style={{
                    x: useTransform(albumSpread, v => -160 * v),
                    z: -150,
                    rotateY: 45,
                    scale: sideAlbumScale,
                    pointerEvents: sideAlbumPointer,
                    boxShadow: sideAlbumShadow,
                    WebkitBoxReflect: albumReflection
                  }}>
                    <img src="/le/le1.png" alt="LE SSERAFIM Album" />
                  </motion.div>
                  <motion.div className="fp-album" style={{
                    x: useTransform(albumSpread, v => -80 * v),
                    z: -50,
                    rotateY: 45,
                    scale: sideAlbumScale,
                    pointerEvents: sideAlbumPointer,
                    boxShadow: sideAlbumShadow,
                    WebkitBoxReflect: albumReflection
                  }}>
                    <img src="/txt/txt1.jpg" alt="TXT Album" />
                  </motion.div>
                  <motion.div className="fp-album fp-album-center" style={{
                    z: 100,
                    scale: centerAlbumScale,
                    x: centerAlbumX,
                    y: centerAlbumY,
                    boxShadow: centerAlbumShadow,
                    WebkitBoxReflect: albumReflection
                  }}>
                    <img src="/hybe-logo.png" alt="HYBE" style={{ objectFit: 'contain' }} />
                  </motion.div>
                  <motion.div className="fp-album" style={{
                    x: useTransform(albumSpread, v => 80 * v),
                    z: -50,
                    rotateY: -45,
                    scale: sideAlbumScale,
                    pointerEvents: sideAlbumPointer,
                    boxShadow: sideAlbumShadow,
                    WebkitBoxReflect: albumReflection
                  }}>
                    <img src="/bts/bts1.jpg" alt="BTS Album" />
                  </motion.div>
                  <motion.div className="fp-album" style={{
                    x: useTransform(albumSpread, v => 160 * v),
                    z: -150,
                    rotateY: -45,
                    scale: sideAlbumScale,
                    pointerEvents: sideAlbumPointer,
                    boxShadow: sideAlbumShadow,
                    WebkitBoxReflect: albumReflection
                  }}>
                    <img src="/txt/txt2.jpg" alt="TXT Album" />
                  </motion.div>
                </div>

                {/* Fullscreen Tracklist Content */}
                <motion.div
                  className="fp-tracklist-container"
                  style={{
                    opacity: tracklistOpacity,
                    y: tracklistY,
                    position: "absolute",
                    inset: 0,
                    pointerEvents: useTransform(tracklistOpacity, val => val > 0.5 ? "auto" : "none")
                  }}
                >
                  {/* Floating Notification */}
                  <AnimatePresence>
                    {!hasSelectedSong && (
                      <motion.div
                        className="fp-song-popup"
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                      >
                        Select a song
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Left Side: Metadata & Buttons */}
                  <div className="fp-tracklist-left">
                    {/* Empty left column to reserve space for the floating album art */}
                  </div>

                  {/* Right Side: Tracklist */}
                  <div className="fp-tracklist-right">
                    <div className="fp-tl-tracks">
                      {tracklist.map((track, i) => (
                        <div
                          className="fp-tl-row"
                          key={i}
                          onClick={() => handlePlayTrack(track)}
                          style={{ cursor: "pointer" }}
                        >
                          <div className="fp-tl-row-left">
                            <span className="fp-tl-num">{track.num}</span>
                            <span className="fp-tl-title">{track.title}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>

          {/* Standalone Vinyl Player UI (Max Player Style) */}
          <AnimatePresence>
            {activeTrack && (
              <motion.div
                className="maximized-overlay fp-standalone-player"
                initial={{ opacity: 0, scale: 0.9, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 50, transition: { duration: 0.4 } }}
                transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                onWheel={(e) => {
                  if (e.currentTarget.scrollTop === 0) {
                    if (!window.arrivedAtTop) window.arrivedAtTop = Date.now();
                    // Ignore inertia for 600ms after reaching the top
                    if (Date.now() - window.arrivedAtTop > 600 && e.deltaY < -15) {
                      if (currentAudio) currentAudio.pause();
                      setActiveTrack(null);
                      setIsPlaying(false);
                      window.arrivedAtTop = null;
                    }
                  } else {
                    window.arrivedAtTop = null;
                  }
                }}
                onTouchStart={(e) => {
                  touchStartY.current = e.touches[0].clientY;
                }}
                onTouchMove={(e) => {
                  if (e.currentTarget.scrollTop === 0) {
                    if (!window.arrivedAtTop) window.arrivedAtTop = Date.now();
                    const touchY = e.touches[0].clientY;
                    const deltaY = touchY - touchStartY.current;
                    if (Date.now() - window.arrivedAtTop > 600 && deltaY > 60) {
                      if (currentAudioRef.current) currentAudioRef.current.pause();
                      setActiveTrack(null);
                      setIsPlaying(false);
                      window.arrivedAtTop = null;
                    }
                  } else {
                    window.arrivedAtTop = null;
                  }
                }}
                onScroll={(e) => {
                  const scrollTop = e.currentTarget.scrollTop;
                  const vh = window.innerHeight;
                  const sectionIndex = Math.round(scrollTop / vh);

                  const shouldBeKaraoke = sectionIndex === 5 || sectionIndex === 6;

                  if (shouldBeKaraoke && !isKaraokeActive) {
                    setIsKaraokeActive(true);

                    if (sectionIndex === 5) {
                      confetti({
                        particleCount: 200,
                        spread: 160,
                        origin: { y: 0 },
                        gravity: 1.2,
                        ticks: 300,
                        colors: ['#000', '#fff', '#ff0055', '#00ffcc']
                      });
                    }

                    const time = currentAudioRef.current?.currentTime || 0;
                    createAndPlayAudio(activeTrack.instrumentalFile || activeTrack.file.replace(".mp3", "_instrumental.mp3"), time);
                  } else if (!shouldBeKaraoke && isKaraokeActive) {
                    setIsKaraokeActive(false);
                    const time = currentAudioRef.current?.currentTime || 0;
                    createAndPlayAudio(activeTrack.file, time);
                  }
                }}
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 100,
                  background: "transparent",
                  animation: "none", // override the slideUp from MaximizedPlayer.css
                  overflowY: "auto",
                  scrollSnapType: "y mandatory",
                  scrollbarWidth: "none"
                }}
              >
                {/* Global Background layers for the scroll container */}
                <div
                  className="maximized-bg"
                  style={{
                    position: "fixed",
                    backgroundImage: activeTrack?.cover ? `url(${activeTrack.cover})` : 'none',
                    backgroundColor: !activeTrack?.cover ? '#e5ff00' : undefined
                  }}
                />
                <div className="maximized-bg-tint" style={{ position: "fixed", background: 'rgba(0, 0, 0, 0.8)' }} />
                <div className="maximized-bg-vignette" style={{ position: "fixed" }} />
                <div className="maximized-bg-noise" style={{ position: "fixed" }} />
                <div className="maximized-bg-spotlight" style={{ position: "fixed" }} />

                {/* ── SECTION 1: Vinyl Stage ── */}
                <div style={{ height: "100vh", width: "100%", flexShrink: 0, scrollSnapAlign: "start", position: "relative", overflow: "hidden", zIndex: 10 }}>
                  <div className="vinyl-stage" style={{ transform: 'scale(1)', height: "100%", margin: 0, padding: 0 }}>
                    <div className="vinyl-unit">
                      {/* Album Sleeve */}
                      <div className="vinyl-sleeve" style={!activeTrack?.cover ? { backgroundColor: '#e5ff00' } : {}}>
                        <img src={activeTrack?.cover || "/txt/txt1.jpg"} alt="Album sleeve" style={!activeTrack?.cover ? { display: 'none' } : {}} />
                      </div>

                      {/* Platter and Record */}
                      <div className="vinyl-platter" style={{ animation: 'none', transform: 'translateX(230px)' }}>
                        <div
                          className={`vinyl-record ${isPlaying ? "spinning" : ""}`}
                          style={{ "--cover-url": `url(${activeTrack?.cover || "/txt/txt1.jpg"})` }}
                        >
                          <div className="vinyl-label">
                            <div className="vinyl-hole" style={{ width: '14px', height: '14px', background: '#111', borderRadius: '50%', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10, border: '2px solid #333' }} />
                            <span className="label-song">{activeTrack?.title || "Track"}</span>
                            <span className="label-artist">{activeTrack?.artist || "HYBE"}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tonearm */}
                    <div className="tonearm-anchor">
                      <div className={`tonearm-wrap ${isPlaying ? "dropped" : ""}`}>
                        <div className="tonearm-base" />
                        <div className="tonearm-arm" />
                        <div className="tonearm-head" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── SECTION 2: Text 1 ── */}
                <div style={{
                  height: "100vh",
                  width: "100%",
                  flexShrink: 0,
                  scrollSnapAlign: "start",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  position: "relative",
                  zIndex: 10,
                  background: "rgba(0, 0, 0, 0.6)"
                }}>
                  <h2 style={{ fontSize: "5rem", fontWeight: 800, letterSpacing: "-0.02em", color: "#fff", textShadow: "0 10px 40px rgba(0,0,0,0.5)", textAlign: "center" }}>Wanna sing along??</h2>
                </div>

                {/* ── SECTION 3: Text 2 ── */}
                <div style={{
                  height: "100vh",
                  width: "100%",
                  flexShrink: 0,
                  scrollSnapAlign: "start",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  position: "relative",
                  zIndex: 10,
                  background: "rgba(0, 0, 0, 0.8)"
                }}>
                  <motion.h3
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: false, amount: 0.5 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    style={{ fontSize: "3rem", fontWeight: 500, color: "rgba(255,255,255,0.8)", letterSpacing: "0.05em", textAlign: "center" }}
                  >
                    no worries we got u
                  </motion.h3>
                </div>

                {/* ── SECTION 4: Lyrics Panel ── */}
                <div className="fp-lyrics-wrapper" style={{ height: "100vh", width: "100%", flexShrink: 0, scrollSnapAlign: "start", position: "relative", zIndex: 10 }}>
                  <AudioContext.Provider value={{
                    audioRef: { current: currentAudio },
                    activeSong: { name: activeTrack?.title, cover: activeTrack?.cover, member: activeTrack?.artist },
                    albumData: { title: "Album", color: "#000", cover: activeTrack?.cover, member: activeTrack?.artist },
                    albumId: "local",
                    currentTime,
                    isPlaying,
                    setIsPlaying: () => { },
                    playNext: () => { },
                    playPrev: () => { },
                    startKaraoke: () => { },
                    cancelKaraoke: () => { },
                    karaokeMode: false,
                    shuffleMode: false,
                    toggleShuffle: () => { },
                    repeatMode: 'off',
                    cycleRepeat: () => { }
                  }}>
                    <LyricsPanel onClose={() => { }} />
                  </AudioContext.Provider>
                </div>

                {/* ── SECTION 5: Text 3 ── */}
                <div style={{
                  height: "100vh",
                  width: "100%",
                  flexShrink: 0,
                  scrollSnapAlign: "start",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  position: "relative",
                  zIndex: 10,
                  background: "rgba(0, 0, 0, 0.9)"
                }}>
                  <motion.h3
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: false, amount: 0.5 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    style={{ fontSize: "4rem", fontWeight: 700, color: "rgba(255,255,255,0.9)", letterSpacing: "0.02em", textAlign: "center" }}
                  >
                    how about...
                  </motion.h3>
                </div>

                {/* ── SECTION 6: Karaoke Party ── */}
                <div style={{
                  height: "100vh",
                  width: "100%",
                  flexShrink: 0,
                  scrollSnapAlign: "start",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  position: "relative",
                  zIndex: 10,
                  background: "#e5ff00" // Vibrant yellow for the party!
                }}>
                  <motion.h2
                    initial={{ opacity: 0, scale: 0.8, y: 40 }}
                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                    viewport={{ once: false, amount: 0.5 }}
                    transition={{ duration: 0.6, type: "spring", bounce: 0.5 }}
                    style={{ fontSize: "6rem", fontWeight: 900, color: "#000", textTransform: "uppercase", letterSpacing: "-0.05em", textAlign: "center", textShadow: "0 10px 30px rgba(0,0,0,0.2)" }}
                  >
                    karaokee party !!!
                  </motion.h2>
                </div>

                {/* ── SECTION 7: Karaoke Lyrics Panel ── */}
                <div className="fp-lyrics-wrapper" style={{ height: "100vh", width: "100%", flexShrink: 0, scrollSnapAlign: "start", position: "relative", zIndex: 10 }}>
                  <AudioContext.Provider value={{
                    audioRef: { current: currentAudio },
                    activeSong: { name: activeTrack?.title, cover: activeTrack?.cover, member: activeTrack?.artist },
                    albumData: { title: "Album", color: "#000", cover: activeTrack?.cover, member: activeTrack?.artist },
                    albumId: "local",
                    currentTime,
                    isPlaying,
                    setIsPlaying: () => { },
                    playNext: () => { },
                    playPrev: () => { },
                    startKaraoke: () => { },
                    cancelKaraoke: () => { },
                    karaokeMode: true,
                    shuffleMode: false,
                    toggleShuffle: () => { },
                    repeatMode: 'off',
                    cycleRepeat: () => { }
                  }}>
                    <LyricsPanel onClose={() => { }} hideSingers={true} />
                  </AudioContext.Provider>
                </div>

                {/* ── SECTION 8: 3D Spatial Grid ── */}
                <div
                  className="fp-section-8-wrapper"
                  style={{ height: "400vh", width: "100%", flexShrink: 0, scrollSnapAlign: "start", position: "relative", zIndex: 20, background: "#000" }}
                >
                  <div className="stuck-grid">
                    <h2 style={{
                      position: "absolute",
                      zIndex: 10,
                      fontSize: "5rem",
                      fontWeight: 800,
                      textAlign: "center",
                      pointerEvents: "none",
                      color: "#fff",
                      textShadow: "0 10px 30px rgba(0,0,0,0.8)"
                    }}>
                      we wanna show ur love towords music with
                    </h2>
                    {
                      [
                        // BTS (15)
                        "/bts/bts1.jpg", "/bts/bts2.jpg", "/bts/bts3.jpg", "/bts/bts4.jpg", "/bts/bts5.jpg",
                        "/bts/bts6.jpg", "/bts/bts7.jpg", "/bts/bts8.jpg", "/bts/bts9.jpg", "/bts/bts10.jpg",
                        "/bts/bts11.jpg", "/bts/bts12.jpg", "/bts/bts13.jpg", "/bts/bts14.jpg", "/bts/bts15.jpg",
                        // TXT (13)
                        "/txt/txt1.jpg", "/txt/txt2.jpg", "/txt/txt3.jpg", "/txt/txt4.jpg", "/txt/txt5.jpg",
                        "/txt/txt6.jpg", "/txt/txt7.png", "/txt/txt8.png", "/txt/txt9.jpg", "/txt/txt10.jpg",
                        "/txt/txt11.jpg", "/txt/txt12.jpg", "/txt/txt13.png",
                        // LE SSERAFIM (9)
                        "/le/le1.png", "/le/le2.png", "/le/le3.jpg", "/le/le4.jpg", "/le/le5.png",
                        "/le/le6.jpg", "/le/le7.png", "/le/le8.jpg", "/le/le9.png",
                        // Extras to reach 40
                        "/bts/promise.png", "/bts/stay_alive.png", "/bts/take_two.png"
                      ].map((src, i) => (
                        <div key={i} className="grid-item" style={{
                          backgroundImage: `url('${src}')`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          borderRadius: '0.5vmin',
                          boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
                        }}></div>
                      ))
                    }
                  </div>
                </div>

                {/* ── SECTION 9: Activity Heatmap ── */}
                <div style={{
                  height: "100vh",
                  width: "100%",
                  flexShrink: 0,
                  scrollSnapAlign: "start",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  position: "relative",
                  zIndex: 20,
                  background: "#0d0d0d"
                }}>
                  <motion.h2
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: false, amount: 0.5 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    style={{
                      fontSize: "4rem",
                      fontWeight: 800,
                      marginBottom: "3rem",
                      letterSpacing: "-0.02em",
                      background: "linear-gradient(90deg, #ffea00, #ff9d00, #ff4d85, #6200ea)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      textShadow: "0 0 40px rgba(255, 77, 133, 0.4)"
                    }}
                  >
                    Musical Footprint
                  </motion.h2>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: false, amount: 0.5 }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                    className="fp-heatmap-container"
                  >
                    <div className="fp-heatmap-wrapper">
                      <div className="fp-heatmap-y-axis">
                        <span /><span>Mon</span><span /><span>Wed</span><span /><span>Fri</span><span />
                      </div>
                      <div className="fp-heatmap-content">
                        <div className="fp-heatmap-x-axis">
                          <span style={{ gridColumn: 2 }}>Jan</span>
                          <span style={{ gridColumn: 6 }}>Feb</span>
                          <span style={{ gridColumn: 10 }}>Mar</span>
                          <span style={{ gridColumn: 15 }}>Apr</span>
                          <span style={{ gridColumn: 20 }}>May</span>
                        </div>
                        <div className="fp-heatmap-grid">
                          {heatmapSquares.map((sq, i) => (
                            <div
                              key={i}
                              className={`fp-heatmap-square ${sq.level > 0 ? 'fp-heatmap-active' : ''}`}
                              style={{
                                gridColumn: sq.col + 1,
                                gridRow: sq.row + 1,
                                animationDelay: `${Math.random() * -10}s`, // Negative delay so they start at random colors immediately
                                animationDuration: `${3 + Math.random() * 4}s` // Slower shift between colors
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* ── SECTION 10: Call to Action ── */}
                <div style={{
                  height: "100vh",
                  width: "100%",
                  flexShrink: 0,
                  scrollSnapAlign: "start",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  position: "relative",
                  zIndex: 20,
                  background: "#000"
                }}>
                  <motion.h2
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: false, amount: 0.5 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    style={{
                      fontSize: "4rem",
                      fontWeight: 800,
                      color: "#fff",
                      marginBottom: "3rem",
                      textAlign: "center",
                      textShadow: "0 0 20px rgba(255,255,255,0.2)",
                      maxWidth: "800px"
                    }}
                  >
                    lets experices these all in the app flowy
                  </motion.h2>
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: false, amount: 0.5 }}
                    transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                    onClick={() => navigate("/")}
                    style={{
                      padding: "1.2rem 4rem",
                      fontSize: "1.8rem",
                      fontWeight: 800,
                      color: "#000",
                      background: "#fff",
                      border: "none",
                      borderRadius: "50px",
                      cursor: "pointer",
                      boxShadow: "0 0 20px rgba(255,255,255,0.3)",
                      transition: "all 0.2s ease",
                      textTransform: "uppercase",
                      letterSpacing: "2px"
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = "scale(1.05)";
                      e.currentTarget.style.boxShadow = "0 0 30px rgba(255,255,255,0.5)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                      e.currentTarget.style.boxShadow = "0 0 20px rgba(255,255,255,0.3)";
                    }}
                  >
                    join us
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}