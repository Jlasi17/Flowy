import { BrowserRouter, Routes, Route } from "react-router-dom";
import AudioPlayerProvider from "./AudioPlayerProvider";
import PersistentAudioPlayer from "./PersistentAudioPlayer";

import Hero from "./components/Hero";
import CardSection from "./components/CardSection";
import Dashboard from "./Dashboard";
import AlbumPage from "./AlbumPage";
import MuseumGallery from "./MuseumGallery";
import LyricsSyncPage from "./LyricsSyncPage";

function App() {
  return (
    <AudioPlayerProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <div className="app">
                <Hero />
                {/* Physical spacer for scroll snapping to reveal the fixed CardSection */}
                <section className="snap-spacer" style={{ height: '100vh', pointerEvents: 'none' }} />
                <CardSection />
              </div>
            }
          />
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