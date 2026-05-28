import React, { useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AudioContext } from './AudioPlayerProvider';
import './AddToPlaylistModal.css';

export default function AddToPlaylistModal({ isOpen, onClose, song }) {
  const { userPlaylists, addSongToPlaylist, createPlaylist } = useContext(AudioContext);
  const [isCreating, setIsCreating] = React.useState(false);

  if (!isOpen || !song) return null;

  const handleSelectPlaylist = (playlistId) => {
    addSongToPlaylist(playlistId, song);
    onClose();
  };

  const handleCreateNew = () => {
    // This is a simple create action; we can trigger the global CreatePlaylistModal 
    // or just prompt for a name. A simple prompt is easiest.
    const title = window.prompt("New Playlist Name:");
    if (title && title.trim()) {
      const newId = createPlaylist({ title: title.trim(), color: '#C084FC' });
      addSongToPlaylist(newId, song);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="atp-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="atp-panel"
            initial={{ scale: 0.9, opacity: 0, x: '-50%', y: '-50%' }}
            animate={{ scale: 1, opacity: 1, x: '-50%', y: '-50%' }}
            exit={{ scale: 0.9, opacity: 0, x: '-50%', y: '-50%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <button className="atp-close-btn" onClick={onClose}>✕</button>

            <div className="atp-header">
              <h2>Add to Playlist</h2>
              <p className="atp-subtitle">{song.name} • {song.artist}</p>
            </div>

            <div className="atp-list">
              {userPlaylists && userPlaylists.length > 0 ? (
                userPlaylists.map(pl => (
                  <button
                    key={pl.id}
                    className="atp-playlist-item"
                    onClick={() => handleSelectPlaylist(pl.id)}
                  >
                    <div
                      className="atp-playlist-color"
                      style={{ backgroundColor: pl.color || '#C084FC' }}
                    />
                    <div className="atp-playlist-info">
                      <span className="atp-playlist-title">{pl.title}</span>
                      <span className="atp-playlist-count">{pl.songs?.length || 0} tracks</span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="atp-empty">
                  No playlists found. Create one first!
                </div>
              )}
            </div>
            
            <div className="atp-footer">
              <button className="atp-create-btn" onClick={handleCreateNew}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                New Playlist
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
