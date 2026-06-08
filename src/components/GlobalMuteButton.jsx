import React, { useState, useEffect } from "react";

export const GlobalMuteManager = {
  isMuted: false,
  mediaElements: new Set(),
  toggleMute() {
    this.isMuted = !this.isMuted;
    this.mediaElements.forEach(el => {
      try {
        el.muted = this.isMuted;
      } catch(e) {}
    });
    window.dispatchEvent(new CustomEvent('globalMuteChange', { detail: { isMuted: this.isMuted } }));
    return this.isMuted;
  }
};

// Intercept new Audio()
const OriginalAudio = window.Audio;
window.Audio = function(...args) {
  const audio = new OriginalAudio(...args);
  GlobalMuteManager.mediaElements.add(audio);
  audio.muted = GlobalMuteManager.isMuted;
  return audio;
};

// Intercept createElement
const originalCreateElement = document.createElement;
document.createElement = function(tagName, options) {
  const el = originalCreateElement.call(document, tagName, options);
  if (tagName.toLowerCase() === 'audio' || tagName.toLowerCase() === 'video') {
    GlobalMuteManager.mediaElements.add(el);
    try { el.muted = GlobalMuteManager.isMuted; } catch(e) {}
  }
  return el;
};

// Override play to forcefully apply mute on any element
const originalPlay = window.HTMLMediaElement.prototype.play;
window.HTMLMediaElement.prototype.play = function() {
  GlobalMuteManager.mediaElements.add(this);
  if (GlobalMuteManager.isMuted) {
    try { this.muted = true; } catch(e) {}
  }
  return originalPlay.apply(this, arguments);
};

// Keep tracking them if they appear via innerHTML
const observer = new MutationObserver((mutations) => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      if (node.tagName && (node.tagName.toLowerCase() === 'audio' || node.tagName.toLowerCase() === 'video')) {
        GlobalMuteManager.mediaElements.add(node);
        node.muted = GlobalMuteManager.isMuted;
      } else if (node.querySelectorAll) {
        node.querySelectorAll('audio, video').forEach(el => {
          GlobalMuteManager.mediaElements.add(el);
          el.muted = GlobalMuteManager.isMuted;
        });
      }
    });
  });
});
observer.observe(document.documentElement, { childList: true, subtree: true });

// Initial pass
setTimeout(() => {
  document.querySelectorAll('audio, video').forEach(el => {
    GlobalMuteManager.mediaElements.add(el);
    el.muted = GlobalMuteManager.isMuted;
  });
}, 0);

// We also need to intercept Web Audio API for complete silence if needed,
// but for our GaplessAudio we can just listen to the custom event.

export default function GlobalMuteButton() {
  const [isMuted, setIsMuted] = useState(GlobalMuteManager.isMuted);

  useEffect(() => {
    const handleMuteChange = (e) => setIsMuted(e.detail.isMuted);
    window.addEventListener('globalMuteChange', handleMuteChange);
    return () => window.removeEventListener('globalMuteChange', handleMuteChange);
  }, []);

  return (
    <button 
      onClick={() => GlobalMuteManager.toggleMute()}
      style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: 999999,
        background: 'rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.2)',
        color: '#fff',
        borderRadius: '50%',
        width: '48px',
        height: '48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        backdropFilter: 'blur(10px)',
        transition: 'background 0.3s ease'
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
    >
      {isMuted ? (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
      ) : (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
      )}
    </button>
  );
}
