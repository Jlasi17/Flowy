/* eslint-disable */
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./AlbumAdminModal.css";

const AudioPreviewSquare = ({ src }) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);
  const PREVIEW_DURATION = 10; // 10 second preview

  const togglePlay = () => {
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.currentTime = 0;
      setProgress(0);
      audioRef.current.play();
      setPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (audio.currentTime >= PREVIEW_DURATION) {
      audio.pause();
      audio.currentTime = 0;
      setPlaying(false);
      setProgress(0);
    } else {
      setProgress((audio.currentTime / PREVIEW_DURATION) * 100);
    }
  };

  const handleEnded = () => {
    setPlaying(false);
    setProgress(0);
  };

  const radius = 12;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div
      className="album-preview-square"
      onClick={togglePlay}
    >
      <svg width="36" height="36" style={{ position: 'absolute' }}>
        <circle cx="18" cy="18" r={radius} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
        <circle
          cx="18" cy="18" r={radius} fill="none" stroke="white" strokeWidth="2"
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.1s linear', transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
        />
      </svg>
      <div style={{ zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {playing ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white" style={{ marginLeft: '2px' }}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        )}
      </div>
      <audio ref={audioRef} src={src} onTimeUpdate={handleTimeUpdate} onEnded={handleEnded} style={{ display: 'none' }} />
    </div>
  );
};

const LrcPreviewSquare = ({ src }) => {
  return (
    <div
      className="album-preview-square"
      onClick={() => window.open(src, '_blank')}
      title="View Lyrics"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
    </div>
  );
};

export default function AlbumAdminModal({ isOpen, onClose, initialData, onSave, groupId, member }) {
  const [formData, setFormData] = useState({
    id: "",
    title: "",
    year: new Date().getFullYear(),
    cover: "",
    type: "Studio Album",
    songs: []
  });

  const [uploading, setUploading] = useState(false);

  const isSolo = !!member;
  const albumId = initialData?.id || '';
  const getSongPath = (song) => {
    if (!song.file) return "";
    if (song.file.startsWith("blob:") || song.file.startsWith("http") || song.file.startsWith("/")) return song.file;
    const basePath = isSolo ? `/${groupId}songs/solos/` : `/${groupId}songs/`;
    return isSolo ? `${basePath}${song.file}` : `${basePath}${albumId}/${song.file}`;
  };

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData(initialData);
      } else {
        setFormData({
          id: "album_" + Date.now(),
          title: "",
          year: new Date().getFullYear(),
          cover: "",
          type: "Studio Album",
          songs: [{ name: "", file: "", lyricsFile: "" }] // Start with 1 empty song
        });
      }
    }
  }, [isOpen, initialData]);

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const folder = `${groupId}/covers`;
    const form = new FormData();
    form.append("file", file);
    form.append("folder", folder);

    setUploading(true);
    try {
      const res = await fetch("http://localhost:8000/api/admin/upload-file", {
        method: "POST", body: form
      });
      const data = await res.json();
      if (data.status === "ok") {
        setFormData(prev => ({ ...prev, cover: data.path }));
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading cover");
    }
    setUploading(false);
  };

  const handleSongUpload = async (e, index, isLyrics) => {
    const file = e.target.files[0];
    if (!file) return;

    const folder = isLyrics ? "lyrics" : (member ? `${groupId}songs/solos` : `${groupId}songs/${formData.id}`);

    const form = new FormData();
    form.append("file", file);
    form.append("folder", folder);

    setUploading(true);
    try {
      const res = await fetch("http://localhost:8000/api/admin/upload-file", {
        method: "POST", body: form
      });
      const data = await res.json();
      if (data.status === "ok") {
        const newSongs = [...formData.songs];
        if (isLyrics) {
          newSongs[index].lyricsFile = file.name;
        } else {
          newSongs[index].file = file.name;
        }
        setFormData(prev => ({ ...prev, songs: newSongs }));
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading file");
    }
    setUploading(false);
  };

  const addSong = () => {
    setFormData(prev => ({
      ...prev,
      songs: [...prev.songs, { name: "", file: "", lyricsFile: "" }]
    }));
  };

  const updateSong = (idx, field, val) => {
    const newSongs = [...formData.songs];
    newSongs[idx][field] = val;
    setFormData(prev => ({ ...prev, songs: newSongs }));
  };

  const removeSong = (idx) => {
    setFormData(prev => ({
      ...prev,
      songs: prev.songs.filter((_, i) => i !== idx)
    }));
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!formData.title) return alert("Title is required");

    // Clean up empty songs at the end if any
    const cleanSongs = formData.songs.filter(s => s.name || s.file);
    if (!formData.titleSong && cleanSongs.length > 0) {
      formData.titleSong = cleanSongs[0].name;
    }

    onSave({ ...formData, songs: cleanSongs }, member);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="album-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="album-modal-fullscreen"
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Back Arrow */}
            <button className="album-modal-back" onClick={onClose}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            </button>

            <div className="album-modal-content">

              {/* LEFT COLUMN */}
              <div className="album-left-col">
                <div className="album-cover-upload">
                  <input type="file" accept="image/*" onChange={handleCoverUpload} />
                  {formData.cover ? (
                    <img src={formData.cover} alt="Cover" />
                  ) : (
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  )}
                </div>

                <input
                  type="text"
                  className="album-glass-input"
                  placeholder="TITLE BOX"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                />

                <div className="album-date-picker-wrapper">
                  <input
                    type="date"
                    className="album-glass-input"
                    value={formData.release || ''}
                    onChange={e => {
                      const val = e.target.value;
                      const y = val ? val.split('-')[0] : '';
                      setFormData({ ...formData, release: val, year: y });
                    }}
                    title="Release Date"
                  />
                  {!formData.release && <span className="date-placeholder"></span>}
                </div>

                <input
                  type="text"
                  className="album-glass-input"
                  placeholder="TYPE LIKE MINI ALBUM OR SINGLE LIKE THAT"
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                />
              </div>

              {/* RIGHT COLUMN */}
              <div className="album-right-col">
                <div className="album-songs-header">
                  <span>song title</span>
                  <span>song file</span>
                  <span>lyrics file</span>
                  <span style={{ width: '24px' }}></span> {/* spacer for the X button */}
                </div>

                {formData.songs.map((song, i) => (
                  <div className="album-song-row" key={i}>
                    {/* Song Title Line */}
                    <div className="album-song-input-wrapper">
                      <input
                        type="text"
                        className="album-song-input"
                        value={song.name}
                        onChange={e => updateSong(i, 'name', e.target.value)}
                        placeholder="SONG TITLE"
                      />
                    </div>

                    {/* Song File Line */}
                    <div className="album-song-upload-row">
                      {song.file && <AudioPreviewSquare src={getSongPath(song)} />}
                      <div className={`album-file-upload ${song.file ? 'has-file' : ''}`}>
                        <input type="file" accept="audio/*" onChange={(e) => handleSongUpload(e, i, false)} />
                        {song.file ? 'AUDIO ✓' : '+ FILE'}
                      </div>
                    </div>

                    {/* Lyrics File Line */}
                    <div className="album-song-upload-row">
                      {song.lyricsFile && <LrcPreviewSquare src={song.lyricsFile} />}
                      <div className={`album-file-upload ${song.lyricsFile ? 'has-file' : ''}`}>
                        <input type="file" accept=".lrc" onChange={(e) => handleSongUpload(e, i, true)} />
                        {song.lyricsFile ? 'LYRICS ✓' : '+ FILE'}
                      </div>
                    </div>

                    {/* Remove Song Button */}
                    <button
                      className="album-song-remove-btn"
                      onClick={() => removeSong(i)}
                      title="Remove Song"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </div>
                ))}

                <button type="button" className="add-song-btn" onClick={addSong}>
                  + SONG
                </button>
              </div>

            </div>

            <button className="album-save-btn" onClick={handleSubmit} disabled={uploading}>
              {uploading ? "UPLOADING..." : "SAVE"}
            </button>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
