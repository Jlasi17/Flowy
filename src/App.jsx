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
import ProfilePage from "./ProfilePage";
import PlaylistsPage from "./PlaylistsPage";
import { AuthProvider } from "./contexts/AuthContext";
import AuthPage from "./components/AuthPage";
import ProtectedRoute from "./components/ProtectedRoute";

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
    <AuthProvider>
      <AudioPlayerProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/dashboard/:groupId" element={<Dashboard />} />
            <Route path="/album/:id" element={<AlbumPage />} />
            <Route path="/gallery" element={<MuseumGallery />} />
            <Route path="/lyrics-sync" element={<ProtectedRoute><LyricsSyncPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/playlists" element={<ProtectedRoute><PlaylistsPage /></ProtectedRoute>} />
          </Routes>

          <PersistentAudioPlayer />
        </BrowserRouter>
      </AudioPlayerProvider>
    </AuthProvider>
  );
}

export default App;