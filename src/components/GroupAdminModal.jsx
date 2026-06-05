/* eslint-disable */
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./GroupAdminModal.css";

const AudioPreviewSquare = ({ src }) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = React.useRef(null);

  const togglePlay = () => {
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (audio.duration) {
      setProgress((audio.currentTime / audio.duration) * 100);
    }
  };

  const handleEnded = () => {
    setPlaying(false);
    setProgress(0);
  };

  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div 
      className="group-image-preview-square" 
      onClick={togglePlay} 
      style={{ cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)' }}
    >
      <svg width="48" height="48" style={{ position: 'absolute' }}>
        <circle 
          cx="24" cy="24" r={radius} 
          fill="none" 
          stroke="rgba(255,255,255,0.2)" 
          strokeWidth="2" 
        />
        <circle 
          cx="24" cy="24" r={radius} 
          fill="none" 
          stroke="white" 
          strokeWidth="2"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.1s linear', transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
        />
      </svg>
      <div style={{ zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {playing ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white" style={{ marginLeft: '2px' }}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        )}
      </div>
      <audio 
        ref={audioRef} 
        src={src} 
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded} 
        style={{ display: 'none' }} 
      />
    </div>
  );
};

export default function GroupAdminModal({ isOpen, onClose, initialData, onSave }) {
  const [formData, setFormData] = useState({
    id: "",
    title: "",
    imgUrl: "",
    bgUrl: "",
    audioUrl: "",
  });
  
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData(initialData);
      } else {
        setFormData({ id: "", title: "", imgUrl: "", bgUrl: "", audioUrl: "" });
      }
    }
  }, [isOpen, initialData]);

  const handleFileUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    // We will save to a generic "uploads" folder or specific based on type
    const folder = field === 'audioUrl' ? 'openingaudio' : 'homeimage';
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    setUploading(true);
    try {
      // Connect to the local backend running on port 8000
      const res = await fetch("http://localhost:8000/api/admin/upload-file", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.status === "ok") {
        setFormData(prev => ({ ...prev, [field]: data.path }));
      } else {
        alert("Upload failed");
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading file");
    }
    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.id || !formData.title) {
      alert("ID and Title are required");
      return;
    }
    onSave(formData);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div 
            className="modal-container glass-modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>{initialData ? "Edit Group" : "New Group"}</h2>
            <form onSubmit={handleSubmit} className="admin-form">
              <div className="form-group">
                <input 
                  type="text" 
                  value={formData.id} 
                  onChange={e => setFormData({ ...formData, id: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                  disabled={!!initialData}
                  placeholder="GROUP ID (e.g. aespa)"
                  className="group-glass-input"
                />
              </div>
              <div className="form-group">
                <input 
                  type="text" 
                  value={formData.title} 
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="DISPLAY TITLE (e.g. AESPA)"
                  className="group-glass-input"
                />
              </div>

              <div className="form-group">
                <div className="group-upload-row">
                  {formData.imgUrl && <img src={formData.imgUrl} alt="Cover Preview" className="group-image-preview-square" />}
                  <div className="group-file-upload">
                    <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'imgUrl')} />
                    <span>{formData.imgUrl ? "REPLACE COVER IMAGE" : "+ COVER IMAGE (CARD)"}</span>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <div className="group-upload-row">
                  {formData.bgUrl && <img src={formData.bgUrl} alt="Background Preview" className="group-image-preview-square" />}
                  <div className="group-file-upload">
                    <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'bgUrl')} />
                    <span>{formData.bgUrl ? "REPLACE BACKGROUND IMAGE" : "+ BACKGROUND IMAGE"}</span>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <div className="group-upload-row">
                  {formData.audioUrl && <AudioPreviewSquare src={formData.audioUrl} />}
                  <div className="group-file-upload" style={{flex: 1}}>
                    <input type="file" accept="audio/*" onChange={(e) => handleFileUpload(e, 'audioUrl')} />
                    <span>{formData.audioUrl ? "REPLACE HOVER AUDIO" : "+ HOVER AUDIO (.mp3)"}</span>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={onClose} className="group-cancel-btn">CANCEL</button>
                <button type="submit" className="group-save-btn" disabled={uploading}>
                  {uploading ? "UPLOADING..." : "SAVE GROUP"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
