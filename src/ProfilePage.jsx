/* eslint-disable */
import React, { useContext, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { updateProfile } from 'firebase/auth';
import { useAuth } from './contexts/AuthContext';
import { AudioContext } from './AudioPlayerProvider';
import { SINGER_COLORS, getArtistProfileImage } from './utils/singerColors';
import './ProfilePage.css';

// ── Flowing canvas background for Admin UI ──────────────────────────────────
const AdminFlowCanvas = () => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;

    const onResize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    // Create flowing orbs with rich purple/pink/indigo palette
    const ORB_COLORS = [
      'rgba(139, 92, 246, 0.55)',   // violet
      'rgba(217, 70, 239, 0.45)',   // fuchsia
      'rgba(59, 130, 246, 0.40)',   // blue
      'rgba(236, 72, 153, 0.45)',   // pink
      'rgba(99, 102, 241, 0.50)',   // indigo
      'rgba(20, 184, 166, 0.35)',   // teal
    ];

    const orbs = Array.from({ length: 7 }, (_, i) => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 180 + Math.random() * 260,
      vx: (Math.random() - 0.5) * 0.55,
      vy: (Math.random() - 0.5) * 0.45,
      color: ORB_COLORS[i % ORB_COLORS.length],
      phase: Math.random() * Math.PI * 2,
      speed: 0.003 + Math.random() * 0.004,
    }));

    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      // Deep dark base
      ctx.fillStyle = 'rgba(8, 8, 16, 1)';
      ctx.fillRect(0, 0, W, H);

      // Draw each orb as a soft radial gradient blob
      orbs.forEach(orb => {
        orb.phase += orb.speed;
        orb.x += orb.vx + Math.sin(orb.phase * 0.7) * 0.6;
        orb.y += orb.vy + Math.cos(orb.phase * 0.5) * 0.5;

        // Wrap edges with soft bounce
        if (orb.x < -orb.r) orb.x = W + orb.r;
        if (orb.x > W + orb.r) orb.x = -orb.r;
        if (orb.y < -orb.r) orb.y = H + orb.r;
        if (orb.y > H + orb.r) orb.y = -orb.r;

        const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
        grad.addColorStop(0, orb.color);
        grad.addColorStop(0.5, orb.color.replace('0.', '0.2'));
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Subtle noise-like shimmer — tiny fast dots
      t++;
      if (t % 3 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.012)';
        for (let i = 0; i < 60; i++) {
          const sx = Math.random() * W;
          const sy = Math.random() * H;
          ctx.fillRect(sx, sy, 1, 1);
        }
      }

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="admin-flow-canvas" />;
};

const AdminGroupGrid = ({ groupId, members, overrides, onEdit, onRemove, onAdd }) => {
  return (
    <div className="admin-group-row">
      <div className="admin-group-header">
        <h2 className="admin-group-title">{groupId}</h2>
      </div>
      <div className="admin-members-grid">
        <AnimatePresence mode="popLayout">
          {members.map((member) => {
             const resolvedImg = getArtistProfileImage(member);
             const memberOverrides = overrides?.[member] || {};
             const finalImgPath = memberOverrides.image || resolvedImg ||
               `/soloartists/${member.toLowerCase().replace(/[\s-]/g, '')}.jpg`;

             // Case-insensitive color lookup with common aliases
             const colorAliases = { 'taehyung': 'V', 'agust d': 'SUGA', 'jungkook': 'JungKook', 'jimin': 'Jimin' };
             const lowerMember = member.toLowerCase();
             const canonicalName = colorAliases[lowerMember] || member;
             const singerColorEntry = SINGER_COLORS[canonicalName]
               || Object.entries(SINGER_COLORS).find(([k]) => k.toLowerCase() === lowerMember)?.[1]
               || SINGER_COLORS.default;
             const singerColor = singerColorEntry.primary;
             const finalColor = memberOverrides.color || singerColor;

             return (
               <motion.div
                 key={member}
                 className="admin-member-card"
                 initial={{ opacity: 0, scale: 0.8 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.8 }}
                 transition={{ duration: 0.2 }}
               >
                 <div className="admin-member-img-wrapper">
                   {/* Glow blob behind the image — uses singer color */}
                   <div
                     className="admin-member-glow"
                     style={{ background: finalColor }}
                   />
                   <img
                     className="admin-member-img"
                     src={finalImgPath}
                     onError={(e) => {
                       e.target.onerror = null;
                       const femaleGroups = ['lesserafim', 'katseye', 'illit', 'newjeans'];
                       e.target.src = femaleGroups.includes(groupId.toLowerCase())
                         ? '/soloartists/female.png'
                         : '/soloartists/male.png';
                     }}
                     alt={member}
                   />
                   <div className="admin-member-overlay">
                     <button
                       className="admin-overlay-btn edit"
                       onClick={(e) => {
                         e.stopPropagation();
                         onEdit(groupId, member, finalImgPath, finalColor);
                       }}
                     >
                       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                         <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                         <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                       </svg>
                     </button>
                   </div>
                   <button
                     className="admin-remove-corner-btn"
                     onClick={(e) => { e.stopPropagation(); onRemove(groupId, member); }}
                   >
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                       <line x1="18" y1="6" x2="6" y2="18"></line>
                       <line x1="6" y1="6" x2="18" y2="18"></line>
                     </svg>
                   </button>
                 </div>
                 <span className="admin-member-name" style={{ color: finalColor }}>{member}</span>
               </motion.div>
             );
          })}
          {/* Add button — wrapped in card div to match member alignment */}
          <motion.div
            key="add"
            className="admin-member-card"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            {/* Wrapper matches admin-member-img-wrapper size so the button aligns with member images */}
            <div style={{ width: '88px', height: '88px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <button className="admin-add-member-circle" onClick={() => onAdd(groupId)}>
                <span className="plus">+</span>
              </button>
            </div>
            <span className="admin-member-name" style={{ opacity: 0, pointerEvents: 'none', userSelect: 'none' }}>·</span>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default function ProfilePage() {
  const { currentUser, logout, isAdmin } = useAuth();
  const { activeSong, albumData, isPlaying } = useContext(AudioContext);
  const navigate = useNavigate();

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isEditing, setIsEditing] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhotoUrl, setEditPhotoUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollContainerRef = useRef(null);
  
  const [, setTick] = useState(0);
  useEffect(() => {
    // Force a re-render every 2 seconds so that profile stats 
    // update live while listening, and instantly catch cloud sync data.
    const interval = setInterval(() => setTick(t => t + 1), 2000);
    return () => clearInterval(interval);
  }, []);

  const [registryData, setRegistryData] = useState(null);
  const [adminGroupPage, setAdminGroupPage] = useState(0);
  const [adminEditModal, setAdminEditModal] = useState(null);
  useEffect(() => {
    if (isAdmin) {
      fetch('/data/musicRegistry.json')
        .then(res => res.json())
        .then(data => setRegistryData(data))
        .catch(err => console.error("Error loading registry:", err));
    }
  }, [isAdmin]);

  // Keyboard navigation for Admin Pagination
  useEffect(() => {
    if (!isAdmin || adminEditModal || !registryData) return;

    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        // Recalculate totalPages using greedy height packing
        const groupIds = Object.keys(registryData);
        const CARD_ROW_H = 130, HEADER_H = 60, GROUP_GAP = 40;
        const VIEWPORT_H = window.innerHeight - 140;
        
        const pages = [];
        let currentPage = [], leftH = 0, rightH = 0;
        
        groupIds.forEach((gId) => {
          const members = registryData[gId]?.soloists || [];
          const rows = Math.ceil((members.length + 1) / 3);
          const h = HEADER_H + rows * CARD_ROW_H + GROUP_GAP;
          const col = currentPage.length % 2;
          const colH = col === 0 ? leftH : rightH;
          if (currentPage.length >= 2 && colH + h > VIEWPORT_H) {
            pages.push(currentPage);
            currentPage = [gId];
            leftH = h; rightH = 0;
          } else {
            currentPage.push(gId);
            if (col === 0) leftH += h; else rightH += h;
          }
        });
        if (currentPage.length > 0) pages.push(currentPage);
        const totalPages = pages.length;

        if (e.key === 'ArrowLeft') {
          setAdminGroupPage(p => Math.max(0, p - 1));
        } else if (e.key === 'ArrowRight') {
          setAdminGroupPage(p => Math.min(totalPages - 1, p + 1));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdmin, adminEditModal, registryData]);

  const handleScroll = (e) => {
    const scrolled = e.target.scrollTop > 80;
    if (scrolled !== isScrolled) {
      setIsScrolled(scrolled);
    }
  };

  useEffect(() => {
    if (currentUser) {
      setEditName(currentUser.displayName || "Lasya Jetti");
      setEditPhotoUrl(currentUser.photoURL || "");
    }
  }, [currentUser]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      await updateProfile(currentUser, {
        displayName: editName,
        photoURL: editPhotoUrl
      });
      setIsEditing(false);
      window.location.reload(); // Refresh to reflect new auth state
    } catch (error) {
      console.error("Error updating profile", error);
    }
    setIsSaving(false);
  };

  // Mock User Data
  const displayName = currentUser?.displayName || "Lasya Jetti";
  const emailPrefix = currentUser?.email ? currentUser.email.split('@')[0] : 'midnightflowy';
  const handle = `@${emailPrefix}`;

  // Avatar Initials
  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  const initials = getInitials(displayName);

  // Read Analytics Data
  const totalSeconds = Number(localStorage.getItem('flowy_total_seconds') || 0);
  const minutesListened = Math.floor(totalSeconds / 60);
  const streak = Number(localStorage.getItem('flowy_streak') || 0);

  const activeHoursStr = localStorage.getItem('flowy_active_hours');
  let mostActiveHour = "N/A";
  let activeHourAmPm = "";
  if (activeHoursStr) {
    const hours = JSON.parse(activeHoursStr);
    let maxHour = -1;
    let maxVal = -1;
    for (const [hr, val] of Object.entries(hours)) {
      if (val > maxVal) { maxVal = val; maxHour = Number(hr); }
    }
    if (maxHour !== -1) {
      const ampm = maxHour >= 12 ? 'PM' : 'AM';
      const displayHour = maxHour % 12 || 12;
      mostActiveHour = `${displayHour}:00 ${ampm}`;
      activeHourAmPm = ampm;
    }
  }

  const historyStr = localStorage.getItem('flowy_play_history');
  let history = [];
  try {
    const parsed = historyStr ? JSON.parse(historyStr) : [];
    history = Array.isArray(parsed) ? parsed : [];
  } catch (e) { }
  const displayHistory = history.slice(0, 5);

  const countsStr = localStorage.getItem('flowy_play_counts');
  const counts = countsStr ? JSON.parse(countsStr) : {};

  // Aura Colors
  let auraColors = ['#5b21b6', '#db2777', '#1e3a8a']; // defaults
  if (history.length > 0) {
    const colors = history.map(h => h.color).filter(c => c && c.startsWith('#'));
    if (colors.length >= 3) {
      auraColors = [colors[0], colors[1], colors[2]];
    } else if (colors.length > 0) {
      auraColors = [colors[0], colors[0], colors[0]];
    }
  }
  const animationDuration = totalSeconds > 3600 ? '8s' : '15s';

  // Dynamic Bio
  let bio = "Discovering new sounds ✨";
  if (history.length > 3) {
    const artistCounts = {};
    history.forEach(h => {
      artistCounts[h.artist] = (artistCounts[h.artist] || 0) + 1;
    });
    let topArtist = "";
    let maxA = 0;
    for (const [art, count] of Object.entries(artistCounts)) {
      if (count > maxA) { maxA = count; topArtist = art; }
    }
    if (topArtist) bio = `Currently obsessed with ${topArtist} 🎧`;
  }

  // Dynamic Badges
  const badges = [];
  if (history.length === 0) {
    badges.push("New Listener");
  } else {
    const hourNum = parseInt(mostActiveHour);
    if (activeHourAmPm === 'PM' && (hourNum === 12 || hourNum >= 10 || hourNum < 4)) {
      badges.push("Night Owl 🌙");
    } else if (activeHourAmPm === 'AM' && hourNum >= 5 && hourNum < 10) {
      badges.push("Early Bird 🌅");
    } else {
      badges.push("Daytime Vibez ☀️");
    }
    if (minutesListened > 120) badges.push("Music Junkie 🎧");
    if (streak > 2) badges.push(`${streak}-Day Streak 🔥`);
  }

  // Mood Timeline
  const getMoodEmoji = (color) => {
    if (!color) return '✨';
    const hex = color.replace('#', '');
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      if (brightness < 80) return '🖤';
      if (brightness > 200) return '💫';
      if (b > r && b > g) return '🌌';
      if (r > b && r > g) return '🔥';
    }
    return '🎶';
  };
  const moodNodes = history.slice(0, 4).map(h => getMoodEmoji(h.color));
  while (moodNodes.length < 4) moodNodes.push('✨');

  // History Tags
  const getHistoryTag = (item) => {
    const playCount = counts[item.title] || 1;
    if (playCount >= 5) return `on heavy repeat (${playCount} plays)`;
    if (playCount >= 2) return `looped ${playCount} times`;
    return `played ${timeAgo(item.timestamp)}`;
  };

  const timeAgo = (ts) => {
    const diff = Math.floor((Date.now() - ts) / 60000);
    if (diff < 1) return 'just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  // Activity Grid Data (Authentic GitHub Style)
  let dailySecs = {};
  try {
    dailySecs = JSON.parse(localStorage.getItem('flowy_daily_seconds') || '{}');
  } catch (e) { }

  const gridColumns = isMobile ? 12 : 24; // Fit into Bento Tile
  const gridRows = 7;
  const todayDate = new Date();
  const currentDayOfWeek = todayDate.getDay();
  const startDay = new Date(todayDate);
  startDay.setDate(todayDate.getDate() - ((gridColumns - 1) * 7) - currentDayOfWeek);

  const gridSquares = [];
  let totalMinutes = 0;
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthLabels = [];
  let lastMonth = -1;

  for (let col = 0; col < gridColumns; col++) {
    const sundayOfCol = new Date(startDay);
    sundayOfCol.setDate(startDay.getDate() + (col * 7));
    const m = sundayOfCol.getMonth();

    // Add month label if month changed
    if (m !== lastMonth) {
      // Avoid clipping label on the far left by ensuring it's not column 0 or it's mid-month
      if (col > 0 || sundayOfCol.getDate() > 15) {
        monthLabels.push({ label: monthNames[m], col });
      }
      lastMonth = m;
    }

    for (let row = 0; row < gridRows; row++) {
      const d = new Date(startDay);
      d.setDate(startDay.getDate() + (col * 7) + row);
      const dateStr = d.toISOString().split('T')[0];
      const seconds = dailySecs[dateStr] || 0;
      const minutes = Math.round(seconds / 60);

      const isFuture = d > todayDate;
      if (!isFuture) totalMinutes += minutes;

      let level = 0;
      if (minutes > 0) level = 1;
      if (minutes >= 15) level = 2;
      if (minutes >= 30) level = 3;
      if (minutes >= 60) level = 4;

      gridSquares.push({
        date: dateStr,
        minutes,
        level: isFuture ? 0 : level,
        isFuture,
        col,
        row
      });
    }
  }

  if (isAdmin) {
    const groupIds = registryData ? Object.keys(registryData) : [];

    // ── Height-aware greedy packing ──────────────────────────────
    // Estimate how tall each group will be in the 2-col grid
    const CARD_ROW_H = 130;  // px per row of member avatars
    const HEADER_H   = 60;   // group title + gap
    const GROUP_GAP  = 40;   // vertical gap between groups in same column
    const VIEWPORT_H = window.innerHeight - 140; // subtract header bar height

    function estimateGroupHeight(members) {
      const rows = Math.ceil((members.length + 1) / 3); // +1 for add btn
      return HEADER_H + rows * CARD_ROW_H + GROUP_GAP;
    }

    // Greedily pack groups into pages across a 2-column layout
    const pages = [];
    let currentPage = [];
    let leftH = 0;
    let rightH = 0;

    groupIds.forEach((gId) => {
      const members = registryData[gId]?.soloists || [];
      const h = estimateGroupHeight(members);
      const col = currentPage.length % 2; // 0 = left col, 1 = right col
      const colH = col === 0 ? leftH : rightH;

      if (currentPage.length >= 2 && colH + h > VIEWPORT_H) {
        // Start a fresh page
        pages.push(currentPage);
        currentPage = [gId];
        leftH = h;
        rightH = 0;
      } else {
        currentPage.push(gId);
        if (col === 0) leftH += h;
        else rightH += h;
      }
    });
    if (currentPage.length > 0) pages.push(currentPage);

    const totalPages = pages.length;
    const currentGroupIds = pages[Math.min(adminGroupPage, totalPages - 1)] || [];
    // ────────────────────────────────────────────────────────────

    return (
      <div className="admin-groups-page">
        {/* Flowing canvas background */}
        <AdminFlowCanvas />
        {/* Glass panel over the canvas */}
        <div className="admin-glass-panel">
        <div className="admin-dashboard-header">
          <button className="admin-groups-back" onClick={() => navigate(-1)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          </button>
        </div>

        {registryData ? (
          <div className="admin-groups-grid">
            <AnimatePresence mode="popLayout">
              {currentGroupIds.map(groupId => {
                const members = registryData[groupId].soloists || [];
                const overrides = registryData[groupId].overrides || {};
                
                const handleEditMember = (gId, oldName, currentImgPath, currentColor) => {
                  let safeColor = currentColor || '#ffffff';
                  // HTML color picker only accepts 6-char hex. Strip alpha channel if it exists (e.g., #cda7e9ff -> #cda7e9)
                  if (safeColor.length === 9 && safeColor.startsWith('#')) {
                    safeColor = safeColor.substring(0, 7);
                  }
                  
                  setAdminEditModal({
                    groupId: gId,
                    oldName,
                    newName: oldName,
                    image: currentImgPath,
                    color: safeColor
                  });
                };

                const handleRemoveMember = (gId, memberName) => {
                  if (window.confirm(`Remove ${memberName} from ${gId}?`)) {
                    setRegistryData(prev => {
                      const newData = { ...prev };
                      const group = newData[gId];
                      if (group && group.soloists) {
                        group.soloists = group.soloists.filter(m => m !== memberName);
                      }
                      return newData;
                    });
                  }
                };

                const handleAddMember = (gId) => {
                  const newName = window.prompt(`Enter new member name for ${gId}:`);
                  if (newName) {
                    setRegistryData(prev => {
                      const newData = { ...prev };
                      const group = newData[gId];
                      if (group) {
                        if (!group.soloists) group.soloists = [];
                        if (!group.soloists.includes(newName)) group.soloists.push(newName);
                      }
                      return newData;
                    });
                  }
                };

                return (
                  <motion.div
                    key={groupId}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <AdminGroupGrid 
                      groupId={groupId} 
                      members={members}
                      overrides={overrides}
                      onEdit={handleEditMember}
                      onRemove={handleRemoveMember}
                      onAdd={handleAddMember}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="admin-loading">Loading groups...</div>
        )}

        {adminEditModal && (() => {
          const fileInputRef = React.createRef();
          const singerColorEntries = Object.entries(SINGER_COLORS).filter(([k]) => k !== 'default');

          return (
            <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setAdminEditModal(null); }}>
              <div className="admin-modal-content">
                <button className="admin-modal-close" onClick={() => setAdminEditModal(null)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>

                <h3 className="admin-modal-title">Edit {adminEditModal.oldName}</h3>

                {/* Image preview + upload */}
                <div className="admin-modal-img-section">
                  <div className="admin-modal-img-preview" onClick={() => fileInputRef.current?.click()} title="Click to upload image from device">
                    <img
                      src={adminEditModal.image}
                      onError={(e) => e.target.src = '/soloartists/male.png'}
                      alt="Preview"
                      style={{ border: `3px solid ${adminEditModal.color}` }}
                    />
                    <div className="admin-modal-img-upload-hint">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                      <span>Upload</span>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      // Show object URL preview and store the actual File object for upload
                      setAdminEditModal({ 
                        ...adminEditModal, 
                        image: URL.createObjectURL(file), 
                        file: file 
                      });
                    }}
                  />
                </div>

                 <div className="admin-modal-body">
                  <label className="admin-modal-label">Member Name</label>
                  <input
                    className="admin-modal-input"
                    value={adminEditModal.newName}
                    onChange={e => setAdminEditModal({ ...adminEditModal, newName: e.target.value })}
                  />

                  <label className="admin-modal-label">Accent Color</label>
                  {/* Single color wheel — pre-filled with singer's color from singerColors.js */}
                  <div className="admin-modal-color-row">
                    <input
                      type="color"
                      className="admin-color-input"
                      value={adminEditModal.color}
                      onChange={e => setAdminEditModal({ ...adminEditModal, color: e.target.value })}
                    />
                    <span className="admin-color-hex" style={{ color: adminEditModal.color }}>{adminEditModal.color}</span>
                  </div>
                </div>

                <div className="admin-modal-actions">
                  <button className="admin-modal-cancel" onClick={() => setAdminEditModal(null)}>Cancel</button>
                  <button className="admin-modal-save" onClick={async () => {
                    let uploadedImagePath = adminEditModal.image;
                    
                    // If a new file was selected, upload it to the backend folder
                    if (adminEditModal.file) {
                      const formData = new FormData();
                      const ext = adminEditModal.file.name.split('.').pop() || 'jpg';
                      const safeName = adminEditModal.newName.toLowerCase().replace(/[\s-]/g, '');
                      const newFilename = `${safeName}.${ext}`;
                      
                      formData.append('file', adminEditModal.file, newFilename);
                      formData.append('folder', 'soloartists');
                      
                      try {
                        const res = await fetch('/api/admin/upload-file', {
                          method: 'POST',
                          body: formData
                        });
                        const data = await res.json();
                        if (data.status === 'ok') {
                          // Success! The file is permanently saved on the backend.
                          // We DO NOT overwrite `uploadedImagePath` with the backend path here.
                          // Instead, we keep using the local `blob:` URL (adminEditModal.image) 
                          // for the React state so the UI updates instantly without any Vite dev server delays.
                        }
                      } catch (e) {
                        console.error('Failed to upload image', e);
                      }
                    }

                    setRegistryData(prev => {
                      const newData = JSON.parse(JSON.stringify(prev));
                      const group = newData[adminEditModal.groupId];
                      if (group) {
                        if (adminEditModal.newName !== adminEditModal.oldName) {
                          const idx = group.soloists.indexOf(adminEditModal.oldName);
                          if (idx !== -1) group.soloists[idx] = adminEditModal.newName;
                        }
                        if (!group.overrides) group.overrides = {};
                        group.overrides[adminEditModal.newName] = {
                          color: adminEditModal.color,
                          image: uploadedImagePath
                        };
                        if (adminEditModal.newName !== adminEditModal.oldName && group.overrides[adminEditModal.oldName]) {
                          delete group.overrides[adminEditModal.oldName];
                        }
                      }
                      return newData;
                    });
                    setAdminEditModal(null);
                  }}>Save</button>
                </div>
              </div>
            </div>
          );
        })()}
        </div>{/* end admin-glass-panel */}
      </div>
    );
  }

  return (
    <div className="profile-page" onScroll={handleScroll} ref={scrollContainerRef}>
      {/* Background Aura */}
      <div className="profile-aura-bg">
        <div className="aura-blob aura-1" style={{ background: auraColors[0], animationDuration }} />
        <div className="aura-blob aura-2" style={{ background: auraColors[1], animationDuration }} />
        <div className="aura-blob aura-3" style={{ background: auraColors[2], animationDuration }} />
      </div>
      <div className="profile-noise" />

      {/* Main Content */}
      {isMobile ? (
        <div className="mobile-profile-container">
          
          {/* Sticky Header Background (Fades in on scroll) */}
          <div 
            className="mobile-sticky-header"
            style={{ 
              opacity: isScrolled ? 1 : 0, 
              pointerEvents: isScrolled ? 'auto' : 'none',
              transition: 'opacity 0.3s ease'
            }}
          >
             <div className="mobile-sticky-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
               {isScrolled && (
                 <motion.div layoutId="avatar-container" className="mobile-sticky-user" style={{ margin: 0 }}>
                    {currentUser?.photoURL ? (
                      <motion.img layoutId="avatar-img" src={currentUser.photoURL} alt="Profile" className="sticky-avatar" />
                    ) : (
                      <motion.div layoutId="avatar-img" className="sticky-avatar fallback-avatar">{initials}</motion.div>
                    )}
                 </motion.div>
               )}
             </div>

             <div className="mobile-sticky-right">
               {!isEditing && (
                 <button className="mobile-edit-btn sticky-edit-btn" onClick={() => setIsEditing(true)}>
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                 </button>
               )}
             </div>
          </div>

          {/* Normal Header (Fades out on scroll) */}
          <div className="mobile-header" style={{ opacity: isScrolled ? 0 : 1, transition: 'opacity 0.3s ease' }}>
            <button className="mobile-back-btn" onClick={() => navigate(-1)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            {!isEditing && (
              <button className="mobile-edit-btn" onClick={() => setIsEditing(true)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
            )}
          </div>

          {/* Mobile Profile Info */}
          <div className="mobile-profile-info">
             {!isScrolled ? (
               <motion.div layoutId="avatar-container" className="profile-pic-container" style={{ alignSelf: 'center', margin: '0 auto 20px' }}>
                 <div className="profile-pic-pulse" />
                 <div className={`profile-vinyl ${isPlaying ? 'spinning' : ''}`} />
                 {currentUser?.photoURL ? (
                   <motion.img layoutId="avatar-img" src={currentUser.photoURL} alt="Profile" className="profile-pic" />
                 ) : (
                   <motion.div layoutId="avatar-img" className="profile-pic fallback-avatar">{initials}</motion.div>
                 )}
               </motion.div>
             ) : (
               <div style={{ height: '130px', width: '100%', marginBottom: '20px' }} /> // Spacer to prevent layout shift
             )}

             {isEditing ? (
               <div className="profile-edit-form" style={{ margin: '0 auto', textAlign: 'center' }}>
                 <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Display Name" className="profile-edit-input" />
                 <input type="text" value={editPhotoUrl} onChange={(e) => setEditPhotoUrl(e.target.value)} placeholder="Photo URL" className="profile-edit-input" />
                 <div className="profile-edit-actions">
                   <button className="profile-edit-cancel" onClick={() => setIsEditing(false)}>Cancel</button>
                   <button className="profile-edit-save" onClick={handleSaveProfile} disabled={isSaving}>{isSaving ? "Saving..." : "Save"}</button>
                 </div>
               </div>
             ) : (
               <div style={{ textAlign: 'center' }}>
                 <h1 className="profile-name">{displayName}</h1>
                 <p className="profile-handle">{handle}</p>
                 <p className="profile-bio" style={{ margin: '8px auto 16px' }}>"{bio}"</p>
                 <div className="profile-badges">
                   <span className="profile-badge streak-badge" style={{ borderColor: 'rgba(255,140,0,0.4)', color: '#ff9d00', background: 'rgba(255,140,0,0.1)' }}>🔥 {streak} {streak === 1 ? 'Day' : 'Days'}</span>
                   {badges.map((b, i) => <span key={i} className="profile-badge">{b}</span>)}
                 </div>
               </div>
             )}
          </div>

          {/* Activity Heatmap */}
          <div className="mobile-heatmap-section bento-tile activity-tile">
            <div className="activity-grid-header">
              <h3>{totalMinutes.toLocaleString()} mins</h3>
            </div>
            <div className="activity-wrapper">
              <div className="activity-y-axis">
                <span /><span>Mon</span><span /><span>Wed</span><span /><span>Fri</span><span />
              </div>
              <div className="activity-grid-scroll" ref={(el) => { if (el) el.scrollLeft = el.scrollWidth; }}>
                <div className="activity-x-axis" style={{ gridTemplateColumns: `repeat(${gridColumns}, 1fr)` }}>
                  {monthLabels.map((m, i) => (
                    <span key={i} style={{ gridColumn: m.col + 1 }}>{m.label}</span>
                  ))}
                </div>
                <div className="activity-grid" style={{ gridTemplateColumns: `repeat(${gridColumns}, 1fr)` }}>
                  {gridSquares.map((sq, i) => (
                    <div
                      key={i}
                      className={`activity-square activity-level-${sq.level} ${sq.isFuture ? 'activity-future' : ''} ${sq.row <= 1 ? 'tooltip-bottom' : ''}`}
                      data-tooltip={sq.isFuture ? null : `${sq.minutes} mins on ${sq.date}`}
                      style={{ gridColumn: sq.col + 1, gridRow: sq.row + 1 }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* History List */}
          <div className="mobile-history-section bento-tile history-tile">
             <h3 className="bento-tile-title">Live & Recent</h3>
             <div className="history-list bento-history">
              {displayHistory.length > 0 ? (
                displayHistory
                  .slice(0, 5)
                  .map((item) => (
                    <div className="history-item" key={item.id}>
                      <img src={item.cover} alt={item.title} className="history-cover" />
                      <div className="history-details">
                        <div className="history-title">{item.title}</div>
                        <div className="history-artist">{item.artist}</div>
                      </div>
                      <div className="history-emotion">
                        {getHistoryTag(item)}
                      </div>
                    </div>
                  ))
              ) : (
                !activeSong && <div style={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', padding: '12px' }}>
                  Your history is waiting to be written. Play some tracks!
                </div>
              )}
            </div>
          </div>

        </div>
      ) : (
      <div className="bento-container">

          {/* Tile 1: Profile Info */}
          <motion.div
            className="bento-tile profile-info-tile"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <button className="bento-back-btn" onClick={() => navigate(-1)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>

            {!isEditing && (
              <>
                <button className="bento-edit-btn" onClick={() => setIsEditing(true)} aria-label="Edit Profile" title="Edit Profile">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button 
                  className="bento-logout-btn" 
                  onClick={() => setIsLogoutModalOpen(true)} 
                  aria-label="Log Out" 
                  title="Log Out"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                </button>
              </>
            )}

            <div className="profile-pic-container">
              <div className="profile-pic-pulse" />
              <div className={`profile-vinyl ${isPlaying ? 'spinning' : ''}`} />
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt="Profile"
                  className="profile-pic"
                />
              ) : (
                <div className="profile-pic fallback-avatar">
                  {initials}
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="profile-edit-form">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Display Name"
                  className="profile-edit-input"
                />
                <input
                  type="text"
                  value={editPhotoUrl}
                  onChange={(e) => setEditPhotoUrl(e.target.value)}
                  placeholder="Photo URL"
                  className="profile-edit-input"
                />
                <div className="profile-edit-actions">
                  <button className="profile-edit-cancel" onClick={() => setIsEditing(false)}>Cancel</button>
                  <button className="profile-edit-save" onClick={handleSaveProfile} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="profile-name">{displayName}</h1>
                <p className="profile-handle">{handle}</p>
                <p className="profile-bio">"{bio}"</p>

                <div className="profile-badges">
                  {badges.map((b, i) => <span key={i} className="profile-badge">{b}</span>)}
                </div>
              </>
            )}
          </motion.div>

        {/* Tile 2: Stats Grid */}
        <motion.div
          className="bento-tile stats-tile"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="stats-bento-grid">
            <div className="stat-card">
              <div className="stat-label">Listening Streak</div>
              <div className="stat-value">{streak} {streak === 1 ? 'Day' : 'Days'}</div>
              <div className="stat-emotional orange">You can't let go 🔥</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Most Active</div>
              <div className="stat-value">{mostActiveHour}</div>
              <div className="stat-emotional purple">
                {activeHourAmPm === 'PM' && parseInt(mostActiveHour) >= 8 ? 'Night Owl 🌙' : 'Daylight ☀️'}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tile 3: Live & Recent */}
        <motion.div
          className="bento-tile history-tile"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h3 className="bento-tile-title">Live & Recent</h3>

          {activeSong && (
            <div className="live-status">
              <div className="live-glow" />
              <img src={activeSong.cover || albumData?.cover} alt="Now Playing" className="live-status-cover" />
              <div className="live-status-info">
                <p>Currently playing</p>
                <h4>{activeSong.name}</h4>
                <span>{albumData?.member || 'Unknown Artist'}</span>
              </div>
              {isPlaying && (
                <div className="playing-eq" style={{ position: 'absolute', right: '16px' }}>
                  <span></span><span></span><span></span>
                </div>
              )}
            </div>
          )}

          <div className="history-list bento-history">
            {displayHistory.length > 0 ? (
              displayHistory
                .slice(0, 5)
                .map((item) => (
                  <div className="history-item" key={item.id}>
                    <img src={item.cover} alt={item.title} className="history-cover" />
                    <div className="history-details">
                      <div className="history-title">{item.title}</div>
                      <div className="history-artist">{item.artist}</div>
                    </div>
                    <div className="history-emotion">
                      {getHistoryTag(item)}
                    </div>
                  </div>
                ))
            ) : (
              !activeSong && <div style={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', padding: '12px' }}>
                Your history is waiting to be written. Play some tracks!
              </div>
            )}
          </div>
        </motion.div>

        {/* Tile 4: Activity Grid */}
        <motion.div
          className="bento-tile activity-tile"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="activity-grid-header">
            <h3>{totalMinutes.toLocaleString()} mins</h3>
          </div>

          <div className="activity-wrapper">
            <div className="activity-y-axis">
              <span /><span>Mon</span><span /><span>Wed</span><span /><span>Fri</span><span />
            </div>

            <div className="activity-grid-scroll" ref={(el) => { if (el) el.scrollLeft = el.scrollWidth; }}>
              <div className="activity-x-axis" style={{ gridTemplateColumns: `repeat(${gridColumns}, 1fr)` }}>
                {monthLabels.map((m, i) => (
                  <span key={i} style={{ gridColumn: m.col + 1 }}>{m.label}</span>
                ))}
              </div>

              <div className="activity-grid" style={{ gridTemplateColumns: `repeat(${gridColumns}, 1fr)` }}>
                {gridSquares.map((sq, i) => (
                  <div
                    key={i}
                    className={`activity-square activity-level-${sq.level} ${sq.isFuture ? 'activity-future' : ''} ${sq.row <= 1 ? 'tooltip-bottom' : ''}`}
                    data-tooltip={sq.isFuture ? null : `${sq.minutes} mins on ${sq.date}`}
                    style={{ gridColumn: sq.col + 1, gridRow: sq.row + 1 }}
                  />
                ))}
              </div>
            </div>
          </div>
        </motion.div>

      </div>
      )}

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {isLogoutModalOpen && (
          <motion.div 
            className="logout-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsLogoutModalOpen(false)}
          >
            <motion.div 
              className="logout-modal"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Log Out?</h3>
              <p>Are you sure you want to end your Flowy session?</p>
              <div className="logout-modal-actions">
                <button className="logout-modal-cancel" onClick={() => setIsLogoutModalOpen(false)}>
                  Cancel
                </button>
                <button 
                  className="logout-modal-confirm" 
                  onClick={async () => {
                    try {
                      await logout();
                      navigate('/');
                    } catch (e) {
                      console.error("Failed to log out", e);
                    }
                  }}
                >
                  Log Out
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
