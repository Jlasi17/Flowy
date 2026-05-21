import { createContext, useRef, useState, useEffect, useCallback, useMemo } from "react";
import "./AlbumPage.css";

export const AudioContext = createContext();

export const EQ_BANDS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

// ── Karaoke API helpers ──────────────────────────────────────────────────
const KARAOKE_API = '/api';
const WS_BASE = `ws://${window.location.hostname}:8000`;

async function uploadForKaraoke(filePath) {
  // Fetch the audio file from the public path and upload to backend
  const response = await fetch(filePath);
  const blob = await response.blob();
  const formData = new FormData();
  // Extract a reasonable filename
  const fileName = filePath.split('/').pop() || 'audio.mp3';
  formData.append('audio', blob, fileName);
  const res = await fetch(`${KARAOKE_API}/karaoke`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Failed to start karaoke processing');
  return res.json();
}

function connectProgressWS(jobId, onMessage, onError) {
  // Try Vite proxy first, fall back to direct connection
  const wsUrl = `${WS_BASE}/ws/progress/${jobId}`;
  const ws = new WebSocket(wsUrl);
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (e) {
      console.error('WS parse error:', e);
    }
  };
  ws.onerror = (e) => {
    console.error('WS error:', e);
    if (onError) onError(e);
  };
  ws.onclose = () => console.log('WS closed for job:', jobId);
  return ws;
}

export default function AudioPlayerProvider({ children }) {
  const audioRef = useRef(new Audio());
  const vocalAudioRef = useRef(new Audio());

  const [songs, setSongs] = useState([]); // Base album/playlist
  const [currentIndex, setCurrentIndex] = useState(null);
  const [albumData, setAlbumData] = useState(null);
  const [albumId, setAlbumId] = useState(null);

  // QUEUE SYSTEM
  const [queue, setQueue] = useState([]);
  const [activeSong, setActiveSong] = useState(null);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // SHUFFLE & REPEAT
  const [shuffleMode, setShuffleMode] = useState(false); // false = off, true = on
  const [repeatMode, setRepeatMode] = useState('off'); // 'off' | 'one' | 'all'
  const shuffleHistoryRef = useRef([]);

  const toggleShuffle = useCallback(() => setShuffleMode(prev => !prev), []);
  const cycleRepeat = useCallback(() => setRepeatMode(prev => {
    if (prev === 'off') return 'all';
    if (prev === 'all') return 'one';
    return 'off';
  }), []);

  // Fly-to-queue animation state
  const [flyAnimData, setFlyAnimData] = useState(null);
  const queueBtnRef = useRef(null);

  useEffect(() => {
    console.log("Global Queue Updated:", queue);
  }, [queue]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(80);

  // ── KARAOKE STATE ──────────────────────────────────────────────────────
  const [karaokeMode, setKaraokeMode] = useState(false);
  const karaokeModeRef = useRef(false);
  useEffect(() => { karaokeModeRef.current = karaokeMode; }, [karaokeMode]);

  const [karaokeStatus, setKaraokeStatus] = useState('idle'); // 'idle' | 'processing' | 'ready' | 'countdown'
  const [karaokeProgress, setKaraokeProgress] = useState(0);
  const [karaokeJobId, setKaraokeJobId] = useState(null);
  const [karaokeInstrumentalUrl, setKaraokeInstrumentalUrl] = useState(null);
  const [karaokeVocalsUrl, setKaraokeVocalsUrl] = useState(null);
  const [vocalVolume, setVocalVolume] = useState(() => {
    const saved = localStorage.getItem('flowy_vocal_volume');
    return saved !== null ? Number(saved) : 0;
  });
  const [instVolume, setInstVolume] = useState(100);

  useEffect(() => {
    localStorage.setItem('flowy_vocal_volume', vocalVolume);
  }, [vocalVolume]);
  const [nextKaraokeCountdown, setNextKaraokeCountdown] = useState(0);
  const [preloadingNext, setPreloadingNext] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState(0);
  const preloadWsRef = useRef(null);
  const lastPlaybackTimeRef = useRef(0);
  const karaokeWsRef = useRef(null);
  const preloadedJobRef = useRef(null); // { jobId, instrumentalUrl, vocalsUrl }
  const originalSrcRef = useRef(null); // Store original audio src to restore on cancel

  const [lastProcessingDuration, setLastProcessingDuration] = useState(60); // Default 60s
  const processingStartTimeRef = useRef(null);
  const preloadTriggeredRef = useRef(false);
  const countdownIntervalRef = useRef(null);
  const [isCinematicActive, setIsCinematicActive] = useState(false);
  const [albumProgress, setAlbumProgress] = useState(() => {
    try {
      const saved = localStorage.getItem('flowy_album_progress');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const [questStatus, setQuestStatus] = useState(() => {
    try {
      const saved = localStorage.getItem('flowy_quest_status');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  useEffect(() => {
    localStorage.setItem('flowy_album_progress', JSON.stringify(albumProgress));
  }, [albumProgress]);

  useEffect(() => {
    localStorage.setItem('flowy_quest_status', JSON.stringify(questStatus));
  }, [questStatus]);

  const acceptQuest = (id) => {
    setQuestStatus(prev => ({ ...prev, [id]: true }));
  };

  const resetQuest = (id) => {
    setQuestStatus(prev => ({ ...prev, [id]: false }));
    setAlbumProgress(prev => ({ ...prev, [id]: [] }));
  };

  const shadowAudioRef = useRef(new Audio());
  const shadowGainNodeRef = useRef(null);


  // Audio Context & Nodes Refs
  const audioCtxRef = useRef(null);
  const vocalSourceRef = useRef(null);
  const instSourceRef = useRef(null);
  const vocalGainNodeRef = useRef(null);
  const instGainNodeRef = useRef(null);

  const initAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  // Initialize Instrumental & Vocal Path when AudioCtx starts
  useEffect(() => {
    if (karaokeMode && karaokeStatus === 'ready' && audioRef.current && vocalAudioRef.current) {
      const ctx = initAudioCtx();

      // Instrumental Path
      if (!instSourceRef.current) {
        instSourceRef.current = ctx.createMediaElementSource(audioRef.current);
        const gainNode = ctx.createGain();
        gainNode.gain.value = instVolume / 100;
        instSourceRef.current.connect(gainNode);
        gainNode.connect(ctx.destination);
        instGainNodeRef.current = gainNode;
      }

      // Vocal Path
      if (!vocalSourceRef.current && karaokeVocalsUrl) {
        vocalAudioRef.current.src = karaokeVocalsUrl;
        vocalSourceRef.current = ctx.createMediaElementSource(vocalAudioRef.current);
        const gainNode = ctx.createGain();
        gainNode.gain.value = vocalVolume / 100;
        vocalSourceRef.current.connect(gainNode);
        gainNode.connect(ctx.destination);
        vocalGainNodeRef.current = gainNode;
      }

      // Shadow Path (Hidden for transitions)
      if (!shadowGainNodeRef.current && shadowAudioRef.current) {
        const shadowGain = ctx.createGain();
        shadowGain.gain.value = 0; // Starts muted
        const source = ctx.createMediaElementSource(shadowAudioRef.current);
        source.connect(shadowGain);
        shadowGain.connect(ctx.destination);
        shadowGainNodeRef.current = shadowGain;
      }
    }
  }, [karaokeMode, karaokeStatus, karaokeVocalsUrl, initAudioCtx]);

  // Precision Tracking: Keep ref synced with actual hardware time + Sync Vocal track
  useEffect(() => {
    const audio = audioRef.current;
    const vocals = vocalAudioRef.current;
    if (!audio) return;

    const updateSync = () => {
      lastPlaybackTimeRef.current = audio.currentTime;
      
      // Sync Vocal track to Instrumental track
      if (karaokeMode && karaokeStatus === 'ready' && vocals) {
        if (Math.abs(vocals.currentTime - audio.currentTime) > 0.05) {
          vocals.currentTime = audio.currentTime;
        }
      }
    };

    audio.addEventListener('timeupdate', updateSync);
    audio.addEventListener('seeking', updateSync);
    return () => {
      audio.removeEventListener('timeupdate', updateSync);
      audio.removeEventListener('seeking', updateSync);
    };
  }, [karaokeMode, karaokeStatus]);

  // Play/Pause sync
  useEffect(() => {
    const audio = audioRef.current;
    const vocals = vocalAudioRef.current;
    if (isPlaying) {
      audio.play().catch(() => { });
      if (karaokeMode && karaokeStatus === 'ready') vocals.play().catch(() => { });
    } else {
      audio.pause();
      vocals.pause();
    }
  }, [isPlaying, karaokeMode, karaokeStatus]);

  const playBeep = useCallback((frequency = 600, duration = 0.1) => {
    const ctx = initAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  }, [initAudioCtx]);

  // Sync Vocal Gain
  useEffect(() => {
    if (vocalGainNodeRef.current) {
      vocalGainNodeRef.current.gain.value = vocalVolume / 100;
    }
  }, [vocalVolume]);

  // Sync Instrumental Gain
  useEffect(() => {
    if (instGainNodeRef.current) {
      instGainNodeRef.current.gain.value = instVolume / 100;
    }
  }, [instVolume]);

  const updateVolume = useCallback((val) => {
    setVolume(val);
    if (audioRef.current) audioRef.current.volume = val / 100;
  }, []);

  const showToast = useCallback((msg, color = null) => {
    setToastMessage({ message: msg, color });
    setTimeout(() => setToastMessage(null), 2000);
  }, []);

  const addToQueue = useCallback((song) => {
    const queueSong = { ...song, qId: song.qId || Math.random().toString(36).substr(2, 9) };
    setQueue((prev) => [...prev, queueSong]);
    showToast("Added to queue", song.color);
  }, [showToast]);

  const insertIntoQueue = useCallback((song, index) => {
    const queueSong = { ...song, qId: song.qId || Math.random().toString(36).substr(2, 9) };
    setQueue((prev) => {
      const newQueue = [...prev];
      newQueue.splice(index, 0, queueSong);
      return newQueue;
    });
    showToast("Added to queue", song.color);
  }, [showToast]);

  const triggerFlyAnimation = useCallback((sourceRect, songName) => {
    const targetEl = queueBtnRef.current;
    if (!targetEl) { return; }
    const targetRect = targetEl.getBoundingClientRect();
    setFlyAnimData({ sourceRect, targetRect, songName });
  }, []);

  const removeFromQueue = useCallback((index) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const playFromQueue = useCallback((index) => {
    setQueue((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      const song = prev[index];
      const remaining = prev.filter((_, i) => i !== index);
      // Set active song immediately
      setActiveSong(song);
      setAlbumData({
        title: song.albumTitle || 'Album',
        cover: song.cover,
        member: song.member,
        color: song.color,
      });
      return remaining;
    });
  }, []);

  const reorderQueue = useCallback((startIndex, endIndex) => {
    setQueue((prev) => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  }, []);

  const getRandomIndex = (excludeIdx, length) => {
    if (length <= 1) return 0;
    let idx;
    do { idx = Math.floor(Math.random() * length); } while (idx === excludeIdx);
    return idx;
  };

  const playNext = useCallback(() => {
    // Repeat one is handled in the 'ended' handler
    if (queue.length > 0) {
      const nextSong = queue[0];
      setQueue((q) => q.slice(1));
      setActiveSong(nextSong);
      // Update albumData so the player UI shows the correct album cover/title
      setAlbumData({
        title: nextSong.albumTitle || "Album",
        cover: nextSong.cover || albumData?.cover,
        member: nextSong.member || albumData?.member,
        color: nextSong.color || albumData?.color,
      });
    } else {
      if (currentIndex === null || !songs.length) return;
      if (shuffleMode) {
        const nextIdx = getRandomIndex(currentIndex, songs.length);
        shuffleHistoryRef.current.push(currentIndex);
        setCurrentIndex(nextIdx);
      } else {
        const nextIdx = currentIndex < songs.length - 1 ? currentIndex + 1 : (repeatMode === 'all' ? 0 : null);
        if (nextIdx === null) {
          setIsPlaying(false);
          return;
        }
        setCurrentIndex(nextIdx);
      }
    }
  }, [queue, currentIndex, songs, shuffleMode, repeatMode, albumData]);

  const playPrev = useCallback(() => {
    if (audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    if (currentIndex === null || !songs.length) return;
    if (shuffleMode && shuffleHistoryRef.current.length > 0) {
      const prevIdx = shuffleHistoryRef.current.pop();
      setCurrentIndex(prevIdx);
    } else {
      const prevIdx = currentIndex > 0 ? currentIndex - 1 : songs.length - 1;
      setCurrentIndex(prevIdx);
    }
  }, [currentIndex, songs, shuffleMode]);

  // ── KARAOKE: Start processing ──────────────────────────────────────────
  const startKaraoke = useCallback(async (songToProcess = null) => {
    const targetSong = songToProcess || activeSong;
    if (!targetSong?.filePath) return;

    const triggerCountdownTransition = (jobId, instrumentalUrl, vocalsUrl) => {
      setKaraokeJobId(jobId);
      setKaraokeInstrumentalUrl(instrumentalUrl);
      setKaraokeVocalsUrl(vocalsUrl);
      setKaraokeStatus('countdown');
      setNextKaraokeCountdown(5);
      playBeep(800, 0.1); 

      let count = 5;
      countdownIntervalRef.current = setInterval(() => {
        count -= 1;
        setNextKaraokeCountdown(count);
        if (count > 0) {
          playBeep(800, 0.1);
        } else {
          playBeep(1200, 0.2); 
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
          
          if (processingStartTimeRef.current) {
            const duration = (performance.now() - processingStartTimeRef.current) / 1000;
            console.log(`[Karaoke] Processing took ${duration.toFixed(1)}s`);
            setLastProcessingDuration(duration);
            processingStartTimeRef.current = null;
          }

          setKaraokeStatus('ready');
          audioRef.current.src = instrumentalUrl;
          vocalAudioRef.current.src = vocalsUrl || "";
          audioRef.current.currentTime = 0;
          vocalAudioRef.current.currentTime = 0;
          
          audioRef.current.play().catch(() => { });
          vocalAudioRef.current.play().catch(() => { });
          setIsPlaying(true);
        }
      }, 1000);
    };

    lastPlaybackTimeRef.current = audioRef.current.currentTime;
    audioRef.current.pause();
    vocalAudioRef.current.pause();
    setIsPlaying(false);
    originalSrcRef.current = targetSong.filePath;

    setKaraokeMode(true);
    setInstVolume(100);
    
    // Check for preloaded job matching this song
    if (preloadedJobRef.current && preloadedJobRef.current.filePath === targetSong.filePath) {
      console.log(`[Karaoke] Instant-start using preloaded job!`);
      const { jobId, instrumentalUrl, vocalsUrl } = preloadedJobRef.current;
      preloadedJobRef.current = null;
      preloadTriggeredRef.current = false;
      triggerCountdownTransition(jobId, instrumentalUrl, vocalsUrl);
      return;
    }

    preloadTriggeredRef.current = false;
    processingStartTimeRef.current = performance.now();

    try {
      const { job_id, status } = await uploadForKaraoke(targetSong.filePath);
      setKaraokeJobId(job_id);

      if (status === 'done') {
        const instrumentalUrl = `${KARAOKE_API}/output/${job_id}/no_vocals.mp3`;
        const vocalsUrl = `${KARAOKE_API}/output/${job_id}/vocals.mp3`;
        triggerCountdownTransition(job_id, instrumentalUrl, vocalsUrl);
        return;
      }

      setKaraokeStatus('processing');
      setKaraokeProgress(0);

      const ws = connectProgressWS(job_id, (data) => {
        if (data.status === 'processing') {
          setKaraokeProgress(data.progress);
        } else if (data.status === 'done') {
          setKaraokeProgress(100);
          const instrumentalUrl = `${KARAOKE_API}/output/${job_id}/no_vocals.mp3`;
          const vocalsUrl = data.vocals_url ? `${KARAOKE_API}/output/${job_id}/vocals.mp3` : null;
          triggerCountdownTransition(job_id, instrumentalUrl, vocalsUrl);
          preloadedJobRef.current = null;
          ws.close();
        } else if (data.status === 'error') {
          setKaraokeStatus('idle');
          setKaraokeMode(false);
          if (originalSrcRef.current) {
            audioRef.current.src = originalSrcRef.current;
          }
          showToast('Karaoke processing failed');
          ws.close();
        }
      }, () => {
        console.log('WS connection lost');
      });
      karaokeWsRef.current = ws;
    } catch (e) {
      console.error('Failed to start karaoke:', e);
      setKaraokeStatus('idle');
      setKaraokeMode(false);
      showToast('Failed to connect to Karaoke service');
    }
  }, [activeSong, showToast, isPlaying, volume, initAudioCtx]);

  const startPreloading = useCallback(async (song) => {
    if (!song?.filePath || preloadingNext) return;
    setPreloadingNext(true);
    setPreloadProgress(0);
    const preloadStartTime = performance.now();

    try {
      const { job_id, status } = await uploadForKaraoke(song.filePath);
      if (status === 'done') {
        const instrumentalUrl = `${KARAOKE_API}/output/${job_id}/no_vocals.mp3`;
        const vocalsUrl = `${KARAOKE_API}/output/${job_id}/vocals.mp3`;
        preloadedJobRef.current = { jobId: job_id, instrumentalUrl, vocalsUrl, filePath: song.filePath };
        setPreloadingNext(false);
        return;
      }

      setKaraokeJobId(job_id); // Ensure we track it for cancellation
      const ws = connectProgressWS(job_id, (data) => {
        if (data.status === 'processing') {
          setPreloadProgress(data.progress);
        } else if (data.status === 'done') {
          const instrumentalUrl = `${KARAOKE_API}/output/${job_id}/no_vocals.mp3`;
          const vocalsUrl = data.vocals_url ? `${KARAOKE_API}/output/${job_id}/vocals.mp3` : null;
          preloadedJobRef.current = { jobId: job_id, instrumentalUrl, vocalsUrl, filePath: song.filePath };
          
          const duration = (performance.now() - preloadStartTime) / 1000;
          console.log(`[Karaoke Preload] background processing took ${duration.toFixed(1)}s`);
          setLastProcessingDuration(duration);
          
          setPreloadingNext(false);
          ws.close();
        } else if (data.status === 'error') {
          setPreloadingNext(false);
          ws.close();
        }
      }, () => {
        console.log('Preload WS failed');
      });
      preloadWsRef.current = ws;
    } catch (e) {
      console.error('Preload failed:', e);
      setPreloadingNext(false);
    }
  }, [preloadingNext]);

  const cancelKaraoke = useCallback(() => {
    if (karaokeWsRef.current) karaokeWsRef.current.close();
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    const audio = audioRef.current;
    const vocals = vocalAudioRef.current;
    const shadow = shadowAudioRef.current;
    const ctx = initAudioCtx();

    // 1. Snapshot the exact resume time
    const resumeTime = lastPlaybackTimeRef.current;
    const wasPlaying = !audio.paused || isPlaying;

    // 2. Start preloading the original track in the background
    if (originalSrcRef.current) {
      shadow.src = originalSrcRef.current;
      shadow.preload = "auto";
      
      const transitionDuration = 0.8; // seconds for crossfade
      const startTime = ctx.currentTime;

      const handleReady = () => {
        // 🔥 The Buttery Smooth Handover starts here
        shadow.currentTime = resumeTime;
        
        // Match playback state
        if (wasPlaying) {
          shadow.play().catch(() => {});
        }

        // Apply Easing Curves (LinearRamp is good, but exponential/curved feels more cinematic)
        if (instGainNodeRef.current) {
          instGainNodeRef.current.gain.setValueAtTime(instGainNodeRef.current.gain.value, startTime);
          instGainNodeRef.current.gain.linearRampToValueAtTime(0, startTime + transitionDuration);
        }
        if (vocalGainNodeRef.current) {
          vocalGainNodeRef.current.gain.setValueAtTime(vocalGainNodeRef.current.gain.value, startTime);
          vocalGainNodeRef.current.gain.linearRampToValueAtTime(0, startTime + transitionDuration);
        }
        if (shadowGainNodeRef.current) {
          const targetVol = volume / 100;
          shadowGainNodeRef.current.gain.setValueAtTime(0, startTime);
          shadowGainNodeRef.current.gain.linearRampToValueAtTime(targetVol, startTime + transitionDuration);
        }

        // Final handoff after fade completes
        setTimeout(() => {
          // Permanently swap back to main player
          audio.src = originalSrcRef.current;
          audio.currentTime = shadow.currentTime;
          if (wasPlaying) {
            audio.play().catch(() => {});
            setIsPlaying(true);
          }
          
          // Cleanup shadow
          shadow.pause();
          if (shadowGainNodeRef.current) shadowGainNodeRef.current.gain.value = 0;
          
          // Restore main gains for standard mode
          if (instGainNodeRef.current) instGainNodeRef.current.gain.value = 1.0; 
          
          // Final state cleanup
          setKaraokeMode(false);
          setKaraokeStatus('idle');
          setKaraokeProgress(0);
          setKaraokeJobId(null);
          setKaraokeInstrumentalUrl(null);
          setKaraokeVocalsUrl(null);
          setVocalVolume(0);
          setNextKaraokeCountdown(0);
          setPreloadingNext(false);
          setPreloadProgress(0);
          preloadedJobRef.current = null;
          preloadTriggeredRef.current = false;
        }, (transitionDuration * 1000) + 50);
      };

      // Fallback if network is slow
      const fallbackTimer = setTimeout(handleReady, 2500);

      shadow.addEventListener('canplaythrough', () => {
        clearTimeout(fallbackTimer);
        handleReady();
      }, { once: true });
    } else {
      // Emergency exit if no original src
      setKaraokeMode(false);
      setKaraokeStatus('idle');
    }

    if (karaokeJobId) {
      fetch(`${KARAOKE_API}/karaoke/${karaokeJobId}`, { method: 'DELETE' }).catch(() => { });
    }
    if (preloadedJobRef.current) {
      fetch(`${KARAOKE_API}/karaoke/${preloadedJobRef.current.jobId}`, { method: 'DELETE' }).catch(() => { });
    }
  }, [karaokeStatus, karaokeJobId, isPlaying, volume, initAudioCtx]);

  // ── KARAOKE: Preload next song when ≤60s remain ───────────────────────
  useEffect(() => {
    if (!karaokeMode || karaokeStatus !== 'ready') return;
    const audio = audioRef.current;
    if (!audio?.duration || isNaN(audio.duration)) return;

    const timeRemaining = audio.duration - currentTime;
    const nextIdx = currentIndex !== null && currentIndex < songs.length - 1 ? currentIndex + 1 : null;
    const preloadThreshold = lastProcessingDuration + 15; // Actual time + 15s buffer

    if (timeRemaining <= preloadThreshold && timeRemaining > 0 && nextIdx !== null && !preloadTriggeredRef.current) {
      console.log(`[Karaoke] Triggering preload based on threshold: ${preloadThreshold.toFixed(1)}s`);
      preloadTriggeredRef.current = true;
      startPreloading(songs[nextIdx]);
    }
  }, [currentTime, karaokeMode, karaokeStatus, currentIndex, songs]);

  // ── KARAOKE: Handle song end → next ─────────────────────────────────
  useEffect(() => {
    if (!karaokeMode) return;
    const audio = audioRef.current;

    const handleKaraokeEnded = () => {
      const nextIdx = currentIndex !== null && currentIndex < songs.length - 1 ? currentIndex + 1 : null;
      if (nextIdx === null) {
        cancelKaraoke();
        return;
      }

      // Advance index immediately. 
      // The activeSong useEffect will catch the change and trigger 
      // startKaraoke, which handles processing/countdown automatically.
      setCurrentIndex(nextIdx);
    };

    audio.addEventListener('ended', handleKaraokeEnded);
    return () => {
      audio.removeEventListener('ended', handleKaraokeEnded);
    };
  }, [karaokeMode, currentIndex, songs, cancelKaraoke]);

  // When UI sets base context explicitly
  useEffect(() => {
    if (currentIndex === null || !songs.length) return;
    setActiveSong(songs[currentIndex]);
  }, [currentIndex, songs]);

  // When activeSong changes, physically play it
  useEffect(() => {
    if (!activeSong) return;

    if (karaokeMode) {
      // If we are already in karaoke mode, automatically start processing the new track
      startKaraoke(activeSong);
    } else {
      vocalAudioRef.current.pause();
      // Standard playback - only reset if different song
      if (audioRef.current.src !== activeSong.filePath) {
        audioRef.current.src = activeSong.filePath;
        audioRef.current.play().catch(() => console.log("Playback interrupted"));
        setIsPlaying(true);
        setCurrentTime(0);
      }
    }
  }, [activeSong]);

  useEffect(() => {
    if (!audioRef.current.src) return;
    isPlaying ? audioRef.current.play() : audioRef.current.pause();
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    const update = () => {
      setCurrentTime(audio.currentTime);
      lastPlaybackTimeRef.current = audio.currentTime; // Redundant backup
    };
    const handleEnded = () => {
      if (albumId && activeSong && !activeSong.isHidden) {
        setAlbumProgress(prev => {
          const currentAlbumPlays = prev[albumId] || [];
          if (!currentAlbumPlays.includes(activeSong.name)) {
            const nextPlays = [...currentAlbumPlays, activeSong.name];
            console.log(`[Progress] Recorded "${activeSong.name}" for album ${albumId}. (${nextPlays.length} total)`);
            return { ...prev, [albumId]: nextPlays };
          }
          return prev;
        });
      }

      if (karaokeMode || isCinematicActive) {
        console.log("[Progress] Skipping playNext because karaoke or cinematic is active");
        return; 
      }
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => { });
        return;
      }
      playNext();
    };

    audio.addEventListener("timeupdate", update);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", update);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [queue, currentIndex, songs, repeatMode, shuffleMode, karaokeMode, playNext, albumId, activeSong, isCinematicActive]);

  const contextValue = useMemo(() => ({
    audioRef,
    songs,
    setSongs,
    currentIndex,
    setCurrentIndex,
    albumData,
    setAlbumData,
    albumId,
    setAlbumId,

    queue,
    activeSong,
    isQueueOpen,
    setIsQueueOpen,
    toastMessage,
    addToQueue,
    removeFromQueue,
    clearQueue,
    playFromQueue,
    reorderQueue,
    insertIntoQueue,
    playNext,
    playPrev,
    updateVolume,

    shuffleMode,
    toggleShuffle,
    repeatMode,
    cycleRepeat,

    flyAnimData,
    setFlyAnimData,
    triggerFlyAnimation,
    queueBtnRef,

    karaokeMode,
    setKaraokeMode,
    karaokeStatus,
    setKaraokeStatus,
    karaokeProgress,
    setKaraokeProgress,
    karaokeJobId,
    setKaraokeJobId,
    karaokeInstrumentalUrl,
    setKaraokeInstrumentalUrl,
    karaokeVocalsUrl,
    setKaraokeVocalsUrl,
    vocalVolume,
    setVocalVolume,
    instVolume,
    setInstVolume,
    startKaraoke,
    cancelKaraoke,
    nextKaraokeCountdown,
    preloadingNext,
    preloadProgress,
    initAudioCtx,
    vocalAudioRef,
    vocalSourceRef,
    instSourceRef,
    vocalGainNodeRef,
    instGainNodeRef,
    isCinematicActive,
    setIsCinematicActive,
    albumProgress,
    questStatus,
    acceptQuest,
    resetQuest,
  }), [
    songs, currentIndex, albumData, albumId, queue, isQueueOpen, toastMessage,
    shuffleMode, repeatMode, flyAnimData, isPlaying, currentTime, volume,
    karaokeMode, karaokeStatus, karaokeProgress, karaokeJobId,
    karaokeInstrumentalUrl, karaokeVocalsUrl, vocalVolume, instVolume, cancelKaraoke,
    nextKaraokeCountdown, preloadingNext, preloadProgress,
    startKaraoke, playNext, playPrev, toggleShuffle, cycleRepeat,
    triggerFlyAnimation, addToQueue, removeFromQueue, clearQueue, playFromQueue, reorderQueue,
    isCinematicActive, setIsCinematicActive, albumProgress,
    questStatus, acceptQuest, resetQuest
  ]);

  const finalContextValue = {
    ...contextValue,
    isPlaying,
    setIsPlaying,
    currentTime,
    volume
  };

  return (
    <AudioContext.Provider value={finalContextValue}>
      {children}
    </AudioContext.Provider>
  );
}