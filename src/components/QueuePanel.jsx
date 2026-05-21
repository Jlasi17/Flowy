import { useContext, useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { AudioContext } from "../AudioPlayerProvider";
import SwipeableTrack from "./SwipeableTrack";
import "./QueuePanel.css";

const haptic = (() => {
  let t = 0;
  return (ms = 8) => {
    const now = performance.now();
    if (now - t < 100) return;
    t = now;
    navigator.vibrate?.(ms);
  };
})();

export default function QueuePanel({ onClose }) {
  const {
    queue,
    removeFromQueue,
    reorderQueue,
    clearQueue,
    playFromQueue,
    addToQueue,
    insertIntoQueue,   // NEW — insert at a specific index; falls back to addToQueue if undefined
    activeSong,
    songs,
    currentIndex,
    albumData,
    isPlaying,
    setIsPlaying,
    setCurrentIndex,
  } = useContext(AudioContext);

  const [isClosing, setIsClosing] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const clearConfirmTimer = useRef(null);

  /* ─────────────────────────────────────────────────────────────────
     QUEUE DRAG STATE
     dragIdx   — index of the item being dragged (null = idle)
     targetIdx — current drop target index         (null = idle)
  ───────────────────────────────────────────────────────────────── */
  const [dragIdx, setDragIdx] = useState(null);
  const [targetIdx, setTargetIdx] = useState(null);
  const isDraggingRef = useRef(false);
  const targetIdxRef = useRef(null);
  const queueDragMovedRef = useRef(false);

  // All mutable drag data lives here — no re-renders needed for these
  const dragDataRef = useRef({
    startY: 0, itemH: 64, len: 0,
    dragIdxSnapshot: 0,   // copy of dragIdx at drag-start, always up-to-date
  });
  const pointerRef = useRef({ x: 0, y: 0 });
  const qPreviewRef = useRef(null);
  const rafRef = useRef(null);

  /* ─── Auto-play drag ─── */
  const [apDragging, setApDragging] = useState(false);
  const [apTargetIdx, setApTargetIdx] = useState(null); // insert position in queue
  const apTargetIdxRef = useRef(null);
  const apDragSong = useRef(null);
  const apPreviewRef = useRef(null);
  const apDragRef = useRef(false);
  const apDragDataRef = useRef({ startY: 0, itemH: 64 });
  // Prevent click firing after a drag
  const apDragMovedRef = useRef(false);

  const scrollRef = useRef(null);
  const itemRefs = useRef([]);
  const currentPlayingRef = useRef(null);

  /* ─── Panel close ─── */
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 400);
  };

  /* ─── Scroll to now-playing on open ─── */
  useEffect(() => {
    const el = currentPlayingRef.current;
    const c = scrollRef.current;
    if (!el || !c) return;
    setTimeout(() => {
      c.scrollTo({ top: el.offsetTop - c.clientHeight / 2 + el.offsetHeight / 2, behavior: 'smooth' });
    }, 200);
  }, []);

  /* ─── Cleanup ─── */
  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    clearTimeout(clearConfirmTimer.current);
  }, []);

  /* ─────────────────────────────────────────────────────────────────
     DISPLACEMENT
     User requested: no shifting, just show the drop line.
  ───────────────────────────────────────────────────────────────── */
  // Displacement logic removed.

  /* ─────────────────────────────────────────────────────────────────
     RAF LOOP — runs while isDraggingRef is true
  ───────────────────────────────────────────────────────────────── */
  const startRaf = useCallback((di, len) => {
    const loop = () => {
      if (!isDraggingRef.current) return;
      const d = dragDataRef.current;
      const h = d.itemH;
      const dy = pointerRef.current.y - d.startY;

      // Simple rounding: which slot does the pointer correspond to?
      const slotOffset = Math.round(dy / h);
      const newTarget = Math.max(0, Math.min(len - 1, di + slotOffset));

      if (targetIdxRef.current !== newTarget) {
        haptic(5);
        targetIdxRef.current = newTarget;
        setTargetIdx(newTarget);
      }

      // Move preview via direct DOM
      if (qPreviewRef.current) {
        qPreviewRef.current.style.left = `${pointerRef.current.x + 22}px`;
        qPreviewRef.current.style.top = `${pointerRef.current.y}px`;
      }

      // Auto-scroll near edges
      const c = scrollRef.current;
      if (c) {
        const r = c.getBoundingClientRect();
        const zone = 72;
        const py = pointerRef.current.y;
        if (py < r.top + zone) c.scrollTop -= Math.pow(Math.max(0, 1 - (py - r.top) / zone), 2) * 15;
        else if (py > r.bottom - zone) c.scrollTop += Math.pow(Math.max(0, 1 - (r.bottom - py) / zone), 2) * 15;
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  /* ─────────────────────────────────────────────────────────────────
     AUTO-PLAY RAF — tracks insert position inside the queue list
  ───────────────────────────────────────────────────────────────── */
  const apRafRef = useRef(null);
  const startApRaf = useCallback(() => {
    const loop = () => {
      if (!apDragRef.current) return;
      const d = apDragDataRef.current;
      const h = d.itemH;
      const dy = pointerRef.current.y - d.startY;
      // clamp to [0, queue.length] (can insert after last item too)
      const slot = Math.max(0, Math.min(queue.length, Math.round(dy / h)));
      if (apTargetIdxRef.current !== slot) {
        apTargetIdxRef.current = slot;
        setApTargetIdx(slot);
      }

      if (apPreviewRef.current) {
        apPreviewRef.current.style.left = `${pointerRef.current.x + 22}px`;
        apPreviewRef.current.style.top = `${pointerRef.current.y}px`;
      }

      const c = scrollRef.current;
      if (c) {
        const r = c.getBoundingClientRect();
        const zone = 72;
        const py = pointerRef.current.y;
        if (py < r.top + zone) c.scrollTop -= Math.pow(Math.max(0, 1 - (py - r.top) / zone), 2) * 15;
        else if (py > r.bottom - zone) c.scrollTop += Math.pow(Math.max(0, 1 - (r.bottom - py) / zone), 2) * 15;
      }

      apRafRef.current = requestAnimationFrame(loop);
    };
    apRafRef.current = requestAnimationFrame(loop);
  }, [queue.length]);

  /* ─────────────────────────────────────────────────────────────────
     DRAG START
  ───────────────────────────────────────────────────────────────── */
  const handleDragStart = useCallback((e, index) => {
    const el = itemRefs.current[index];
    const h = el ? el.getBoundingClientRect().height : 64;

    dragDataRef.current = {
      startY: e.clientY,
      itemH: h,
      len: queue.length,
      dragIdxSnapshot: index,
    };
    pointerRef.current = { x: e.clientX, y: e.clientY };
    isDraggingRef.current = true;
    queueDragMovedRef.current = false;

    if (qPreviewRef.current) {
      qPreviewRef.current.style.left = `${e.clientX + 22}px`;
      qPreviewRef.current.style.top = `${e.clientY}px`;
    }

    setDragIdx(index);
    setTargetIdx(index);
    haptic(12);
    e.currentTarget.setPointerCapture(e.pointerId);
    startRaf(index, queue.length);
  }, [queue.length, startRaf]);

  /* ─────────────────────────────────────────────────────────────────
     POINTER MOVE
  ───────────────────────────────────────────────────────────────── */
  const handlePointerMove = useCallback((e) => {
    pointerRef.current = { x: e.clientX, y: e.clientY };

    if (isDraggingRef.current) {
      queueDragMovedRef.current = true;
    }

    if (apDragRef.current) {
      apDragMovedRef.current = true; // mark as a real drag, not a tap
    }
  }, []);

  /* ─────────────────────────────────────────────────────────────────
     POINTER UP
  ───────────────────────────────────────────────────────────────── */
  const handlePointerUp = useCallback(() => {
    /* ── Queue reorder drag end ── */
    if (isDraggingRef.current) {
      cancelAnimationFrame(rafRef.current);
      isDraggingRef.current = false;

      const latestDrag = dragDataRef.current.dragIdxSnapshot;
      const latestTarget = targetIdxRef.current;

      if (latestDrag !== null && latestTarget !== null && latestDrag !== latestTarget) {
        reorderQueue(latestDrag, latestTarget);
      }

      setDragIdx(null);
      setTargetIdx(null);
      targetIdxRef.current = null;
    }

    /* ── Auto-play drag end ── */
    if (apDragRef.current) {
      cancelAnimationFrame(apRafRef.current);
      apDragRef.current = false;

      if (apDragSong.current) {
        const latestSlot = apTargetIdxRef.current;
        const song = apDragSong.current;
        if (typeof insertIntoQueue === 'function' && latestSlot !== null) {
          insertIntoQueue(song, latestSlot);
        } else {
          addToQueue(song);
        }
        apDragSong.current = null;
        setApTargetIdx(null);
        apTargetIdxRef.current = null;
      } else {
        setApTargetIdx(null);
        apTargetIdxRef.current = null;
      }

      setApDragging(false);
    }
  }, [reorderQueue, addToQueue, insertIntoQueue]);

  /* ─── Auto-play drag start ─── */
  const handleApDragStart = useCallback((e, song) => {
    // Find the y-position of the top of the queue list to anchor offsets
    const queueListTop = itemRefs.current[0]
      ? itemRefs.current[0].getBoundingClientRect().top
      : e.clientY;
    const h = itemRefs.current[0]
      ? itemRefs.current[0].getBoundingClientRect().height
      : 64;

    apDragDataRef.current = {
      startY: queueListTop,  // base: top of first queue item
      itemH: h,
    };
    apDragRef.current = true;
    apDragMovedRef.current = false;
    apDragSong.current = song;

    pointerRef.current = { x: e.clientX, y: e.clientY };

    if (apPreviewRef.current) {
      apPreviewRef.current.style.left = `${e.clientX + 22}px`;
      apPreviewRef.current.style.top = `${e.clientY}px`;
    }

    setApDragging(true);
    setApTargetIdx(queue.length); // default: append to end
    haptic(10);
    e.currentTarget.setPointerCapture(e.pointerId);
    startApRaf();
  }, [queue.length, startApRaf]);

  /* ─── Clear queue ─── */
  const handleClearQueue = () => {
    if (clearConfirm) {
      clearQueue();
      setClearConfirm(false);
      clearTimeout(clearConfirmTimer.current);
    } else {
      setClearConfirm(true);
      clearConfirmTimer.current = setTimeout(() => setClearConfirm(false), 2500);
    }
  };

  const upNextSongs = songs.slice((currentIndex ?? 0) + 1);
  const isDragging = dragIdx !== null;
  const draggedSong = isDragging ? queue[dragIdx] : null;

  return (
    <>
      <div className={`queue-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose} />
      <div className={`queue-panel ${isClosing ? 'closing' : ''}`}>

        {/* ─── Header ─── */}
        <div className="queue-header">
          <div className="queue-header-left">
            <h2 className="queue-title">Queue</h2>
            <div className="queue-subtitle">{queue.length} track{queue.length !== 1 ? 's' : ''} upcoming</div>
          </div>
          <div className="queue-header-actions">
            {queue.length > 0 && (
              <button className={`clear-queue-btn ${clearConfirm ? 'confirming' : ''}`} onClick={handleClearQueue}>
                {clearConfirm ? 'Confirm?' : 'Clear'}
              </button>
            )}
            <button className="close-btn" onClick={handleClose}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                <path d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* ─── Scrollable content ─── */}
        <div
          className={`queue-content ${isDragging || apDragging ? 'is-dragging' : ''}`}
          ref={scrollRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* NOW PLAYING */}
          {activeSong && (
            <div className="queue-section-label" style={{ marginTop: 16 }}>Now Playing</div>
          )}
          {activeSong && (
            <div
              className="queue-item playing-item"
              ref={currentPlayingRef}
              onClick={() => setIsPlaying(!isPlaying)}
            >
              <div className="qi-art-wrap">
                {albumData?.cover
                  ? <img src={albumData.cover} alt="" className="qi-art" onError={e => { e.currentTarget.style.display = 'none'; }} />
                  : <div className="qi-art-no-cover">
                    <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </div>
                }
                <div className="qi-art-playing-overlay">
                  <div className="playing-eq"><span /><span /><span /></div>
                </div>
              </div>
              <div className="qi-info">
                <span className="qi-title">{activeSong.name}</span>
                <span className="qi-sub">{activeSong.member || albumData?.member || "Artist"}</span>
              </div>
              {activeSong.duration && <span className="qi-duration">{activeSong.duration}</span>}
            </div>
          )}

          {/* UP NEXT */}
          {(queue.length > 0 || upNextSongs.length > 0) && (
            <div className="queue-section-label">Up Next</div>
          )}

          <div className="queue-list">
            {/* ── Manual Queue ── */}
            {queue.map((qSong, i) => {
              const isGhost = isDragging && dragIdx === i;
              const displacement = 0; // Displacement logic was removed

              // Drop line: show ABOVE the target when dragging down, BELOW when dragging up
              const showAbove = isDragging && !isGhost && i === targetIdx && dragIdx > targetIdx;
              const showBelow = isDragging && !isGhost && i === targetIdx && dragIdx < targetIdx;

              // Auto-play insert indicator: show above slot i when apTargetIdx === i
              const showApInsertAbove = apDragging && apTargetIdx === i;
              // Show after last item
              const showApInsertBelow = apDragging && i === queue.length - 1 && apTargetIdx === queue.length;

              return (
                <motion.div 
                  layout
                  transition={{ type: "spring", stiffness: 350, damping: 28, mass: 0.8 }}
                  key={qSong.qId || `qi-${qSong.filePath ?? qSong.name}-${i}`} 
                  className="queue-row"
                >

                  {(showAbove || showApInsertAbove) && <div className="drop-indicator" />}

                  <SwipeableTrack
                    onSwipeAction={() => !isDragging && removeFromQueue(i)}
                    actionText="✕ Remove"
                    actionColor="rgba(255,74,74,0.25)"
                    disabled={isDragging}
                  >
                    <div className="queue-item-mover">
                      <div
                        className={`queue-item draggable ${isGhost ? 'is-ghost' : ''}`}
                        ref={el => itemRefs.current[i] = el}
                        onClick={() => {
                          if (queueDragMovedRef.current) return;
                          if (!isDragging) playFromQueue(i);
                        }}
                      >
                        {/* Drag handle */}
                        <div
                          className="drag-handle"
                          onPointerDown={e => { e.stopPropagation(); handleDragStart(e, i); }}
                        >
                          <svg viewBox="0 0 20 20" fill="none" width="14" height="14">
                            <rect x="3" y="5" width="14" height="2" rx="1" fill="currentColor" />
                            <rect x="3" y="9" width="14" height="2" rx="1" fill="currentColor" />
                            <rect x="3" y="13" width="14" height="2" rx="1" fill="currentColor" />
                          </svg>
                        </div>

                        {/* Album art */}
                        <div className="qi-art-wrap">
                          {qSong.cover
                            ? <img src={qSong.cover} alt="" className="qi-art" onError={e => { e.currentTarget.style.display = 'none'; }} />
                            : <div className="qi-art-no-cover">
                              <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
                                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
                                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
                              </svg>
                            </div>
                          }
                          <div className="qi-art-play-overlay">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </div>

                        <div className="qi-info">
                          <span className="qi-title">{qSong.name}</span>
                          <span className="qi-sub">{qSong.member || "Artist"}</span>
                        </div>
                        <span className="qi-duration">{qSong.duration || "—"}</span>
                      </div>
                    </div>
                  </SwipeableTrack>

                  {(showBelow || showApInsertBelow) && <div className="drop-indicator" />}
                </motion.div>
              );
            })}

            {/* Drop indicator when queue is empty and ap-dragging */}
            {apDragging && queue.length === 0 && (
              <div className="drop-indicator" style={{ margin: '8px 10px' }} />
            )}

            {/* ── Auto-Play section ── */}
            {upNextSongs.length > 0 && (
              <div className="queue-section-label" style={{ marginTop: 20 }}>Auto-Play</div>
            )}

            {upNextSongs.map((ns, i) => {
              const actualIdx = (currentIndex ?? 0) + 1 + i;

              // FIX: use the song's own cover/member, fall back to albumData only if missing
              const cover = ns.cover ?? albumData?.cover;
              const member = ns.member ?? albumData?.member;

              const apQueueSong = {
                name: ns.name,
                filePath: ns.filePath,
                albumTitle: ns.albumTitle ?? albumData?.title,
                cover,
                member,
                color: ns.color ?? albumData?.color,
                duration: ns.duration,
              };

              return (
                <div key={`ap-${ns.filePath ?? ns.name}-${i}`} className="queue-row">
                  <div
                    className="queue-item auto-next"
                    onClick={() => {
                      // Only fire click if this was NOT a drag
                      if (apDragMovedRef.current) return;
                      setCurrentIndex(actualIdx);
                      setIsPlaying(true);
                    }}
                  >
                    {/* Drag handle — drags to insert at a specific queue position */}
                    <div
                      className="drag-handle ap-drag-handle"
                      title="Drag to add to queue"
                      onPointerDown={e => { e.stopPropagation(); handleApDragStart(e, apQueueSong); }}
                    >
                      <svg viewBox="0 0 20 20" fill="none" width="14" height="14">
                        <rect x="3" y="5" width="14" height="2" rx="1" fill="currentColor" />
                        <rect x="3" y="9" width="14" height="2" rx="1" fill="currentColor" />
                        <rect x="3" y="13" width="14" height="2" rx="1" fill="currentColor" />
                      </svg>
                    </div>

                    {/* Album art — per-song cover */}
                    <div className="qi-art-wrap">
                      {cover
                        ? <img src={cover} alt="" className="qi-art" onError={e => { e.currentTarget.style.display = 'none'; }} />
                        : <div className="qi-art-no-cover">
                          <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
                            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
                            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
                          </svg>
                        </div>
                      }
                      <div className="qi-art-play-overlay">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>

                    <div className="qi-info">
                      <span className="qi-title">{ns.name}</span>
                      <span className="qi-sub">{member || "Artist"}</span>
                    </div>

                    {/* Play hint icon */}
                    <span className="qi-duration ap-play-icon">
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                        <path d="M5 3l14 9-14 9V3z" />
                      </svg>
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Empty state */}
            {queue.length === 0 && upNextSongs.length === 0 && (
              <div className="empty-queue">
                <div className="empty-queue-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="34" height="34">
                    <path d="M9 19V6l12-3v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="15" r="3" />
                  </svg>
                </div>
                <p>Queue is empty</p>
                <span>Add songs to get started</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Floating preview: queue drag ── */}
      {isDragging && draggedSong && createPortal(
        <div
          ref={qPreviewRef}
          className="queue-drag-preview"
          style={{ left: 0, top: 0, transform: 'translateY(-50%)' }}
        >
          {draggedSong.cover && <img src={draggedSong.cover} alt="" className="qdp-art" />}
          <div className="qdp-info">
            <span className="qdp-title">{draggedSong.name}</span>
            <span className="qdp-sub">{draggedSong.member || "Artist"}</span>
          </div>
        </div>,
        document.body
      )}

      {/* ── Floating preview: auto-play drag ── */}
      {apDragging && apDragSong.current && createPortal(
        <div
          ref={apPreviewRef}
          className="queue-drag-preview"
          style={{ left: 0, top: 0, transform: 'translateY(-50%)' }}
        >
          {apDragSong.current.cover && <img src={apDragSong.current.cover} alt="" className="qdp-art" />}
          <div className="qdp-info">
            <span className="qdp-title">{apDragSong.current.name}</span>
            <span className="qdp-sub">{apDragSong.current.member || "Artist"}</span>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}