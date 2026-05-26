import React, { useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AudioContext } from './AudioPlayerProvider';
import './PlaylistDetailModal.css';

export default function PlaylistDetailModal({ playlist, isOpen, onClose, onPlay }) {
  const { deletePlaylist, removeSongFromPlaylist, setSongs, setAlbumData, setAlbumId, setCurrentIndex, setIsPlaying } = useContext(AudioContext);

  if (!playlist) return null;

  const isLikedSongs = playlist.id === 'liked_songs';

  const handleDelete = () => {
    if (!window.confirm(`Delete "${playlist.title}"? This cannot be undone.`)) return;
    deletePlaylist(playlist.id);
    onClose();
  };

  const handleRemoveSong = (index) => {
    removeSongFromPlaylist(playlist.id, index);
  };

  const handlePlaySong = (song, index) => {
    const songList = playlist.songs || [];
    setSongs(songList);
    setAlbumData({
      title: playlist.title,
      cover: playlist.cover,
      member: 'You',
      color: playlist.color,
    });
    setAlbumId(playlist.id);
    setCurrentIndex(index);
    setIsPlaying(true);
  };

  const songs = playlist.songs || [];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="pdm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />

          {/* Sliding Panel */}
          <motion.div
            className="pdm-panel"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
          >
            {/* Glow */}
            <div
              className="pdm-glow"
              style={{ background: `radial-gradient(circle at 50% 0%, ${playlist.color}25, transparent 65%)` }}
            />

            {/* Hero Image / Color */}
            <div className="pdm-hero">
              <div className="pdm-cover-color" style={{ backgroundColor: playlist.color || '#C084FC' }}>
                {isLikedSongs && (
                  <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.15, color: '#fff' }}>
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                )}
              </div>
              <div className="pdm-cover-overlay" />

              {/* Close button */}
              <button className="pdm-close" onClick={onClose} aria-label="Close">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              {/* Hero info overlaid on image */}
              <div className="pdm-hero-info">
                <p className="pdm-hero-label">PLAYLIST</p>
                <h2 className="pdm-hero-title">{playlist.title}</h2>
                <p className="pdm-hero-meta">{songs.length} {songs.length === 1 ? 'song' : 'songs'}</p>
              </div>
            </div>

            {/* Action bar */}
            <div className="pdm-actions">
              <button
                className="pdm-play-btn"
                style={{ background: playlist.color }}
                onClick={() => handlePlaySong(songs[0], 0)}
                disabled={songs.length === 0}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Play All
              </button>

              {!isLikedSongs && (
                <button className="pdm-delete-btn" onClick={handleDelete}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Delete Playlist
                </button>
              )}
            </div>

            {/* Song List */}
            <div className="pdm-songs">
              {songs.length === 0 ? (
                <div className="pdm-empty">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.25 }}>
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                  </svg>
                  <p>No songs yet</p>
                  <span>Add songs from an album to this playlist</span>
                </div>
              ) : (
                songs.map((song, i) => (
                  <motion.div
                    key={i}
                    className="pdm-song-row"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                  >
                    <button className="pdm-song-play" onClick={() => handlePlaySong(song, i)}>
                      <span className="pdm-song-index">{i + 1}</span>
                      <svg className="pdm-song-play-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    </button>

                    <div className="pdm-song-art">
                      {song.cover ? (
                        <img src={song.cover} alt={song.name} />
                      ) : (
                        <div className="pdm-song-art-placeholder" style={{ background: playlist.color + '30' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.6 }}>
                            <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                          </svg>
                        </div>
                      )}
                    </div>

                    <div className="pdm-song-info">
                      <span className="pdm-song-name">{song.name}</span>
                      <span className="pdm-song-artist">{song.member || song.artist || 'Unknown'}</span>
                    </div>

                    {!isLikedSongs && (
                      <button className="pdm-remove-btn" onClick={() => handleRemoveSong(i)} title="Remove from playlist">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
