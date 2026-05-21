import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AudioPlayerProvider from "./AudioPlayerProvider";
import PersistentAudioPlayer from "./PersistentAudioPlayer";

import Hero from "./components/Hero";
import CardSection from "./components/CardSection";
import Dashboard from "./Dashboard";
import AlbumPage from "./AlbumPage";
import MuseumGallery from "./MuseumGallery";
import LyricsSyncPage from "./LyricsSyncPage";

function Home() {
  const [showHero, setShowHero] = React.useState(!sessionStorage.getItem("hasSeenHero"));

  React.useEffect(() => {
    if (showHero) {
      // Set the flag after a short delay so the user sees it once
      const timer = setTimeout(() => {
        sessionStorage.setItem("hasSeenHero", "true");
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [showHero]);

  // If returning, just show the card section directly
  if (!showHero) {
    return (
      <div className="app" style={{ overflowY: 'auto', scrollSnapType: 'none' }}>
        <CardSection />
      </div>
    );
  }

  return (
    <div className="app">
      <Hero />
      <section className="snap-spacer" style={{ height: '100vh', pointerEvents: 'none' }} />
      <CardSection />
    </div>
  );
}

function App() {
  return (
    <AudioPlayerProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard/:groupId" element={<Dashboard />} />
          <Route path="/album/:id" element={<AlbumPage />} />
          <Route path="/gallery" element={<MuseumGallery />} />
          <Route path="/lyrics-sync" element={<LyricsSyncPage />} />
        </Routes>

        <PersistentAudioPlayer />
      </BrowserRouter>
    </AudioPlayerProvider>
  );
}

export default App;