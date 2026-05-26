import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './CreatePlaylistModal.css';

export default function CreatePlaylistModal({ isOpen, onClose, onConfirm }) {
  const [title, setTitle] = useState('');
  const [accentColor, setAccentColor] = useState('#C084FC');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = () => {
    setTitle('');
    setAccentColor('#C084FC');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSubmitting(true);
    // Small delay for the button animation
    await new Promise(r => setTimeout(r, 400));
    // Pass null for cover, pass accentColor for color
    onConfirm(title.trim(), null, accentColor);
    reset();
    setIsSubmitting(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="cpm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={handleClose}
          />

          {/* Modal */}
          <div className="cpm-modal-wrapper">
            <motion.div
              className="cpm-modal"
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            >
              {/* Glow based on accent color */}
              <div className="cpm-glow" style={{ background: `radial-gradient(circle at 50% 0%, ${accentColor}30, transparent 70%)` }} />

              {/* Header */}
              <div className="cpm-header">
                <h2 className="cpm-title">New Playlist</h2>
                <button type="button" className="cpm-close" onClick={handleClose} aria-label="Close">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <form className="cpm-body" onSubmit={handleSubmit}>

                {/* Polaroid Preview */}
                <div className="cpm-polaroid-preview">
                  <div className="cpm-polaroid-photo" style={{ backgroundColor: accentColor }}>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.15, color: '#fff' }}>
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  </div>
                  <div className="cpm-polaroid-footer">
                    <span className="cpm-polaroid-title">{title || 'Playlist Name'}</span>
                  </div>
                </div>

                {/* Title Input */}
                <div className="cpm-field">
                  <label className="cpm-label">Playlist Name</label>
                  <input
                    type="text"
                    className="cpm-input"
                    placeholder="e.g. Late Night Drives"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    autoFocus
                    maxLength={60}
                    style={{ '--accent': accentColor }}
                  />
                  <span className="cpm-char-count">{title.length}/60</span>
                </div>

                {/* Accent Color Picker */}
                <div className="cpm-field">
                  <label className="cpm-label">Accent Color</label>
                  <div className="cpm-color-wheel-wrapper">
                    <input 
                      type="color" 
                      value={accentColor.length === 7 ? accentColor : '#C084FC'} 
                      onChange={(e) => setAccentColor(e.target.value)} 
                      className="cpm-color-wheel-input"
                      title="Pick custom color"
                    />
                    <div className="cpm-color-wheel-display">
                      <div className="cpm-color-wheel-icon">
                        {/* A colorful conic gradient icon */}
                      </div>
                      <span style={{ color: accentColor }}>Choose Color</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="cpm-actions">
                  <button type="button" className="cpm-btn-cancel" onClick={handleClose}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="cpm-btn-create"
                    disabled={!title.trim() || isSubmitting}
                    style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}99)` }}
                  >
                    {isSubmitting ? (
                      <span className="cpm-spinner" />
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Create Playlist
                      </>
                    )}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
