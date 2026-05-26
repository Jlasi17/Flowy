import React, { useContext, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AudioContext } from '../AudioPlayerProvider';
import './AddToPlaylistPopup.css';

/**
 * A small popup menu that lists all user playlists.
 * Position it near the double-clicked element using `anchorRect`.
 *
 * Props:
 *  - song: the song object to add
 *  - anchorRect: DOMRect of the element that was double-clicked (for positioning)
 *  - onClose: function to close the popup
 */
export default function AddToPlaylistPopup({ song, anchorRect, onClose, onCreatePlaylist }) {
  const { userPlaylists, addSongToPlaylist } = useContext(AudioContext);

  const handleAdd = (playlistId, playlistTitle) => {
    addSongToPlaylist(playlistId, song);
    onClose({ added: true, playlistTitle });
  };

  const [style, setStyle] = useState({ opacity: 0 });

  useEffect(() => {
    if (anchorRect) {
      let x = anchorRect.x || window.innerWidth / 2;
      let y = anchorRect.y || window.innerHeight / 2;

      // Keep it within screen bounds
      const popupWidth = 280;
      const popupHeight = 350; // estimated max height
      if (x + popupWidth > window.innerWidth - 16) x = window.innerWidth - popupWidth - 16;
      if (y + popupHeight > window.innerHeight - 16) y = window.innerHeight - popupHeight - 16;

      setStyle({
        top: y,
        left: x,
        transform: 'none' // Remove translate(-50%, -50%) because we anchor top-left to cursor
      });
    }
  }, [anchorRect]);

  if (!song) return null;

  return (
    <AnimatePresence>
      {song && (
        <>
          {/* Invisible backdrop to close on outside click */}
          <div className="atp-backdrop" onClick={() => onClose({ added: false })} onContextMenu={(e) => { e.preventDefault(); onClose({ added: false }); }} />

          <motion.div
            className="atp-popup"
            style={style}
            initial={{ opacity: 0, scale: 0.9, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
          >
            {/* Header */}
            <div className="atp-header">
              <span className="atp-title">Add to Playlist</span>
              <span className="atp-song-name" title={song.name}>{song.name}</span>
            </div>

            {/* Playlist list */}
            <div className="atp-list">
              {userPlaylists.length === 0 ? (
                <div className="atp-empty">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                  <p>No playlists yet.</p>
                </div>
              ) : (
                userPlaylists.map((pl) => (
                  <button
                    key={pl.id}
                    className="atp-playlist-row"
                    onClick={() => handleAdd(pl.id, pl.title)}
                  >
                    <div className="atp-playlist-art">
                      <img src={pl.cover} alt={pl.title} />
                    </div>
                    <div className="atp-playlist-info">
                      <span className="atp-playlist-name">{pl.title}</span>
                      <span className="atp-playlist-meta">{pl.tracks || 0} songs</span>
                    </div>
                    <div className="atp-playlist-add-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </div>
                  </button>
                ))
              )}
            </div>
            
            {/* Footer / Create New */}
            <div className="atp-footer">
              <button 
                className="atp-create-btn"
                onClick={() => {
                  onClose({ added: false });
                  if (onCreatePlaylist) onCreatePlaylist();
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                New Playlist
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
