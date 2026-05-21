import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { groupsData } from './data/musicRegistry';
import './LyricsSyncPage.css';

/* ─── Helpers ──────────────────────────────────────── */
const fmt = (s) => {
  if (isNaN(s) || s < 0) return '00:00.00';
  const m = Math.floor(s / 60);
  const sc = Math.floor(s % 60);
  const cs = Math.floor((s % 1) * 100);
  return `${String(m).padStart(2,'0')}:${String(sc).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
};
const fmtShort = (s) => {
  if (isNaN(s) || s < 0) return '0:00';
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2,'0')}`;
};

const parseTimeString = (str) => {
  const m = str.match(/^(\d{2}):(\d{2})\.(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1]) * 60 + parseInt(m[2]) + parseInt(m[3]) / 100;
};

function parseLrcFile(text) {
  const res = [];
  for (const raw of text.split('\n')) {
    const t = raw.trim();
    if (!t) continue;
    
    // Match: [00:00.00][Singer] text OR [00:00.00] text
    const m1 = t.match(/^\[(\d{2}):(\d{2})\.(\d{2,3})\](?:\[([^\]]+)\])?\s*(.*)$/);
    if (m1) {
      const time = parseInt(m1[1])*60 + parseInt(m1[2]) + parseInt(m1[3].padEnd(3,'0'))/1000;
      res.push({ time, singer: m1[4]?.trim()||null, text: m1[5]?.trim()||'', synced: false, id: Math.random().toString(36).substr(2, 9) });
      continue;
    }
    
    // Match: [Singer] text (No timestamp)
    const m2 = t.match(/^\[([^\]]+)\]\s*(.*)$/);
    if (m2) {
      res.push({ time: null, singer: m2[1].trim(), text: m2[2].trim(), synced: false, id: Math.random().toString(36).substr(2, 9) });
      continue;
    }

    // Just text
    res.push({ time: null, singer: null, text: t, synced: false, id: Math.random().toString(36).substr(2, 9) });
  }
  return res;
}

function buildSongLibrary() {
  const lib = [];
  Object.entries(groupsData).forEach(([,g]) => {
    const bp = g.basePath||'', sbp = g.soloBasePath||'';
    (g.albums||[]).forEach(y => (y.albums||[]).forEach(a => {
      ((g.songs||{})[a.id]||[]).forEach(s => lib.push({
        name:s.name, filePath:`${bp}${a.id}/${s.file}`,
        albumTitle:a.title, cover:a.cover, member:a.member||g.title, color:a.color
      }));
    }));
    (g.soloAlbums||[]).forEach(mo => (mo.albums||[]).forEach(a => {
      ((g.soloSongs||{})[a.id]||[]).forEach(s => lib.push({
        name:s.name, filePath:`${sbp}${s.file}`,
        albumTitle:a.title, cover:a.cover, member:a.member||mo.member||g.title, color:a.color
      }));
    }));
  });
  return lib;
}

const PHASE = { SYNC:'sync', DONE:'done', ERROR:'error' };

export default function LyricsSyncPage() {
  const navigate = useNavigate();
  const songLibrary = useMemo(() => buildSongLibrary(), []);
  
  const [phase, setPhase] = useState(PHASE.SYNC);
  const [song, setSong] = useState(null);
  const [loadErr, setLoadErr] = useState(null);
  
  const [lines, setLines] = useState([]);
  const [idx, setIdx] = useState(0);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [curTime, setCurTime] = useState(0);
  const [dur, setDur] = useState(0);
  const animRef = useRef(null);
  
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [reviewMode, setReviewMode] = useState(false);
  
  const containerRef = useRef(null);
  const activeRef = useRef(null);
  const linesRef = useRef(lines);
  const idxRef = useRef(idx);
  
  useEffect(() => { linesRef.current = lines; }, [lines]);
  useEffect(() => { idxRef.current = idx; }, [idx]);

  /* ── Auto-select song from URL ── */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetSong = params.get('song');
    if (targetSong) {
      const s = songLibrary.find(x => x.name === targetSong);
      if (s) {
        selectSong(s);
      } else {
        setLoadErr("Song not found in library.");
        setPhase(PHASE.ERROR);
      }
    } else {
      setLoadErr("No song specified. Please open this tool from the music player.");
      setPhase(PHASE.ERROR);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songLibrary]);

  /* ── Select song ── */
  const selectSong = async (s) => {
    setSong(s); setLoadErr(null);
    const rn = s.name.replace(/^\d{1,2}\.\s+/,'').replace(/:/g,'').replace(/\s+/g,' ').trim();
    const vars = [...new Set([rn, rn.toLowerCase(), rn.toUpperCase(), s.name, s.name.toLowerCase()])];
    let parsed = null;
    for (const v of vars) {
      try {
        const r = await fetch(`/lyrics/${encodeURIComponent(v)}.lrc?t=${Date.now()}`);
        if (!r.ok) continue;
        const t = await r.text();
        if (t.trim().toLowerCase().startsWith('<!doctype html>')) continue; // Vite fallback for missing files
        const p = parseLrcFile(t);
        if (p.length > 0) { parsed = p; break; }
      } catch { continue; }
    }
    if (!parsed?.length) { 
      setLoadErr(`No .lrc file found for "${s.name}"`); 
      setPhase(PHASE.ERROR);
      return; 
    }
    
    // If a line has a parsed timestamp > 0, we can assume it's synced
    const preparedLines = parsed.map(l => ({ ...l, synced: l.time > 0 }));
    
    setLines(preparedLines); 
    setIdx(0); 
    setPhase(PHASE.SYNC);
    setPlaying(false); 
    setSaveStatus(null);
    setUndoStack([]); 
    setRedoStack([]);
    setReviewMode(false);
    if (audioRef.current) audioRef.current.currentTime = 0;
  };

  /* ── Audio loop ── */
  const tick = useCallback(() => {
    if (audioRef.current) setCurTime(audioRef.current.currentTime);
    animRef.current = requestAnimationFrame(tick);
  }, []);
  
  useEffect(() => {
    if (playing) animRef.current = requestAnimationFrame(tick);
    else cancelAnimationFrame(animRef.current);
    return () => cancelAnimationFrame(animRef.current);
  }, [playing, tick]);

  /* ── Auto-scroll ── */
  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      activeRef.current.scrollIntoView({ behavior:'smooth', block:'center' });
    }
  }, [idx]);

  /* ── Auto-follow playback in Review Mode ── */
  useEffect(() => {
    if (!reviewMode || !playing || lines.length === 0) return;
    let activeIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].time !== null && lines[i].time !== undefined && lines[i].time <= curTime) {
        activeIdx = i;
      }
    }
    if (activeIdx !== -1 && activeIdx !== idx) {
      setIdx(activeIdx);
    }
  }, [curTime, playing, lines, idx, reviewMode]);

  /* ── Undo / Redo ── */
  const pushUndo = useCallback((prevLines) => {
    setUndoStack(s => [...s.slice(-50), JSON.parse(JSON.stringify(prevLines))]);
    setRedoStack([]);
  }, []);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack(s => [...s, JSON.parse(JSON.stringify(linesRef.current))]);
    setUndoStack(s => s.slice(0, -1));
    setLines(prev);
  }, [undoStack]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(s => [...s, JSON.parse(JSON.stringify(linesRef.current))]);
    setRedoStack(s => s.slice(0, -1));
    setLines(next);
  }, [redoStack]);

  /* ── Keyboard ── */
  useEffect(() => {
    if (phase !== PHASE.SYNC) return;
    const handle = (e) => {
      if (e.target.tagName === 'INPUT' && e.target.type === 'text') return;
      
      const i = idxRef.current;
      const all = linesRef.current;
      
      switch (e.code) {
        case 'Space': {
          if (e.target.tagName === 'BUTTON') return;
          e.preventDefault();
          if (!audioRef.current) return;
          audioRef.current.paused ? audioRef.current.play() : audioRef.current.pause();
          break;
        }
        case 'Enter': {
          e.preventDefault();
          if (i >= all.length) return;
          const t = audioRef.current?.currentTime || 0;
          // Musixmatch behavior: advance to next line FIRST, then stamp it
          const nextIdx = Math.min(i + 1, all.length - 1);
          pushUndo(all);
          setLines(p => { 
            const u = [...p]; 
            u[nextIdx] = { ...u[nextIdx], time: t, synced: true }; 
            return u; 
          });
          setIdx(nextIdx);
          break;
        }
        case 'ArrowDown': {
          e.preventDefault();
          setIdx(p => Math.min(p + 1, all.length - 1));
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          setIdx(p => Math.max(0, p - 1));
          break;
        }
        case 'ArrowLeft': {
          e.preventDefault();
          // Seek audio backward
          if (audioRef.current) {
            const seekAmt = e.shiftKey ? 0.5 : 0.1;
            audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - seekAmt);
          }
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          // Seek audio forward
          if (audioRef.current) {
            const seekAmt = e.shiftKey ? 0.5 : 0.1;
            audioRef.current.currentTime = Math.min(
              audioRef.current.duration || 0,
              audioRef.current.currentTime + seekAmt
            );
          }
          break;
        }
        case 'KeyZ': {
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            e.shiftKey ? redo() : undo();
          }
          break;
        }
        default: break;
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [phase, pushUndo, undo, redo]);

  /* ── Generate LRC ── */
  const genLrc = () => lines.map(l => {
    const tt = `[${fmt(l.time||0)}]`;
    const st = l.singer ? `[${l.singer}]` : '';
    return `${tt}${st} ${l.text}`;
  }).join('\n');

  /* ── Save / Download ── */
  const saveLrc = async () => {
    const content = genLrc();
    const fn = song.name.replace(/^\d{1,2}\.\s+/,'').replace(/:/g,'').trim();
    setSaving(true); setSaveStatus(null);
    try {
      const r = await fetch('/api/save-lyrics', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({filename:fn, content})
      });
      setSaveStatus(r.ok ? 'success' : 'error');
    } catch { setSaveStatus('error'); }
    finally { setSaving(false); }
  };
  
  const downloadLrc = () => {
    const b = new Blob([genLrc()], {type:'text/plain'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = `${song.name}.lrc`;
    a.click();
  };

  const handleSeek = (e) => {
    if (audioRef.current) audioRef.current.currentTime = (Number(e.target.value)/100)*dur;
  };
  
  const progress = dur ? (curTime/dur)*100 : 0;

  /* ── Line Operations ── */
  const clickLine = (i) => setIdx(i);

  const previewLine = (i, e) => {
    e.stopPropagation();
    if (audioRef.current && lines[i].time !== null) {
      audioRef.current.currentTime = lines[i].time;
      audioRef.current.play();
    }
  };

  const adjustTime = (i, delta, e) => {
    e.stopPropagation();
    pushUndo(lines);
    setLines(p => {
      const u = [...p];
      u[i] = { ...u[i], time: Math.max(0, (u[i].time || 0) + delta) };
      return u;
    });
  };

  const deleteLine = (i, e) => {
    e.stopPropagation();
    pushUndo(lines);
    setLines(p => p.filter((_, index) => index !== i));
    if (idx >= lines.length - 1) setIdx(Math.max(0, lines.length - 2));
  };

  const handleManualTimeChange = (i, val) => {
    const t = parseTimeString(val);
    if (t !== null) {
      pushUndo(lines);
      setLines(p => {
        const u = [...p];
        u[i] = { ...u[i], time: t, synced: true };
        return u;
      });
    }
  };

  return (
    <div className="mxm-sync-page">
      <audio ref={audioRef} src={song?.filePath}
        onLoadedMetadata={() => setDur(audioRef.current?.duration||0)}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)} />

      {/* ══ ERROR PHASE ══ */}
      {phase === PHASE.ERROR && (
        <div className="mxm-error-phase">
          <div className="mxm-error-card">
            <h2>Oops!</h2>
            <p>{loadErr}</p>
            <button className="mxm-btn-ghost" onClick={() => navigate(-1)}>Go Back</button>
          </div>
        </div>
      )}

      {/* ══ MAIN STUDIO LAYOUT ══ */}
      {(phase === PHASE.SYNC || phase === PHASE.DONE) && (
        <div className="mxm-studio-layout">
          <main className="mxm-main">
            {/* Header */}
            <header className="mxm-main-header">
              <div className="mxm-header-left">
                <button className="mxm-back-btn" onClick={() => { audioRef.current?.pause(); navigate(-1); }}>
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/></svg>
                </button>
                <div className="mxm-song-header">
                  <img src={song?.cover} alt="" className="mxm-header-cover" />
                  <div className="mxm-header-info">
                    <h2>{song?.name}</h2>
                    <p>{song?.member}</p>
                  </div>
                </div>
              </div>
              
              {/* Undo/Redo/Export controls moved here */}
              <div className="mxm-header-actions">
                <div className="mxm-history-btns">
                  <button className="mxm-action-btn" onClick={undo} disabled={!undoStack.length} title="Undo (⌘Z)">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg>
                  </button>
                  <button className="mxm-action-btn" onClick={redo} disabled={!redoStack.length} title="Redo (⌘⇧Z)">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style={{transform:'scaleX(-1)'}}><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg>
                  </button>
                </div>
                <button 
                  className={`mxm-btn-review ${reviewMode ? 'active' : ''}`} 
                  onClick={() => setReviewMode(!reviewMode)}
                  title="Toggle Auto-Scroll to follow playback timestamps"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style={{marginRight: '6px', display: 'inline-block', verticalAlign: 'middle'}}>
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                  </svg>
                  <span>{reviewMode ? 'Review Mode: ON' : 'Review Mode: OFF'}</span>
                </button>
                <button className="mxm-btn-export" onClick={() => setPhase(PHASE.DONE)}>
                  Finish & Export
                </button>
              </div>
            </header>

            {/* Editor Area */}
            {phase === PHASE.SYNC ? (
              <div className="mxm-editor-area">
                <div className="mxm-lyrics-list" ref={containerRef}>
                  <div style={{height: '40vh'}} />
                  {lines.map((l, i) => {
                    const isCur = i === idx;
                    const isPast = i < idx;
                    const statusClass = l.synced ? 'synced' : 'unsynced';
                    
                    return (
                      <div 
                        key={l.id} 
                        ref={isCur ? activeRef : null}
                        className={`mxm-line ${isCur ? 'active' : ''} ${isPast ? 'past' : ''} ${statusClass}`}
                        onClick={() => clickLine(i)}
                      >
                        {/* Play Preview Button */}
                        <button className="mxm-line-play" onClick={(e) => previewLine(i, e)} title="Preview from here">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                        </button>
                        
                        {/* Adjust / Timestamp */}
                        <div className="mxm-line-time-controls">
                          <button className="mxm-adj-btn" onClick={(e) => adjustTime(i, -0.05, e)}>-</button>
                          <input 
                            type="text" 
                            className="mxm-time-input" 
                            key={`time-${l.id}-${l.time}`}
                            defaultValue={fmt(l.time !== null ? l.time : 0)} 
                            onBlur={(e) => handleManualTimeChange(i, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleManualTimeChange(i, e.target.value);
                                e.target.blur();
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button className="mxm-adj-btn" onClick={(e) => adjustTime(i, 0.05, e)}>+</button>
                        </div>
                        
                        {/* Singer & Lyric Text */}
                        <div className="mxm-line-content">
                          {l.singer && <span className="mxm-singer-tag">[{l.singer}]</span>}
                          <span className="mxm-lyric-text">{l.text}</span>
                        </div>
                        
                        {/* Delete Button */}
                        <button className="mxm-line-delete" onClick={(e) => deleteLine(i, e)} title="Delete line">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                        </button>
                      </div>
                    );
                  })}
                  <div style={{height: '50vh'}} />
                </div>
              </div>
            ) : (
              /* Export Phase */
              <div className="mxm-export-area">
                <div className="mxm-export-card">
                  <h2>Ready to export!</h2>
                  <p>{lines.filter(l => l.synced).length} out of {lines.length} lines synced.</p>
                  
                  <div className="mxm-export-preview">
                    <pre>{genLrc()}</pre>
                  </div>
                  
                  <div className="mxm-export-buttons">
                    <button className="mxm-btn-export" onClick={saveLrc} disabled={saving}>
                      {saving ? 'Saving...' : saveStatus === 'success' ? 'Saved to App!' : 'Save to App'}
                    </button>
                    <button className="mxm-btn-secondary" onClick={downloadLrc}>
                      Download .lrc file
                    </button>
                    <button className="mxm-btn-ghost" onClick={() => setPhase(PHASE.SYNC)}>
                      Back to Editor
                    </button>
                  </div>
                  {saveStatus && saveStatus !== 'success' && <p className="mxm-error">Failed to save.</p>}
                </div>
              </div>
            )}
          </main>

          {/* FLOATING PLAYER */}
          <div className="mxm-floating-player">
            <button className="mxm-player-play" onClick={() => { if(!audioRef.current) return; playing ? audioRef.current.pause() : audioRef.current.play(); }}>
              {playing 
                ? <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                : <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              }
            </button>
            <div className="mxm-player-time">{fmtShort(curTime)}</div>
            <div className="mxm-player-progress-wrap">
              <input type="range" className="mxm-player-seek" min="0" max="100" value={progress} onChange={handleSeek} style={{'--p': `${progress}%`}}/>
            </div>
            <div className="mxm-player-time">{fmtShort(dur)}</div>
            
            <div className="mxm-player-hints">
              <span><kbd>Space</kbd> Play/Pause</span>
              <span><kbd>Enter</kbd> Next & Stamp</span>
              <span><kbd>←→</kbd> Seek ±0.1s</span>
              <span><kbd>↑↓</kbd> Navigate</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
