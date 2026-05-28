import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './contexts/AuthContext';
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import './SettingsPage.css';

const FluidToggle = ({ active, onClick }) => {
  return (
    <div className={`fluid-toggle ${active ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <motion.div
        className="toggle-thumb"
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{ marginLeft: active ? '24px' : '0px' }}
      />
    </div>
  );
};

const SettingsModule = ({ icon, title, subtitle, rightElement, onClick, glowClass, children }) => (
  <div className={`settings-module ${onClick ? 'clickable' : ''}`} onClick={onClick}>
    <div className="module-header">
      <div className={`module-icon ${glowClass || ''}`}>
        {icon}
      </div>
      <div className="module-right">
        {rightElement}
      </div>
    </div>
    <div className="module-info">
      <div className="module-title">{title}</div>
      {subtitle && <div className="module-subtitle">{subtitle}</div>}
    </div>
    {children}
  </div>
);

const SettingsSlider = ({ title, subtitle, min, max, value, onChange, formatValue, icon, glowClass }) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="settings-module">
      <div className="module-header">
        <div className={`module-icon ${glowClass || ''}`}>
          {icon}
        </div>
        <div className="value-text">
          {formatValue ? formatValue(value) : value}
        </div>
      </div>
      <div className="module-info">
        <div className="module-title">{title}</div>
        {subtitle && <div className="module-subtitle">{subtitle}</div>}
      </div>
      <div className="slider-container">
        <div className="slider-track-wrap">
          <div className="slider-fill" style={{ width: `${percentage}%` }} />
          <input
            type="range"
            className="slider-track"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
};

export default function SettingsPage() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('account');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhotoUrl, setEditPhotoUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setEditName(currentUser.displayName || "Lasya Jetti");
      setEditPhotoUrl(currentUser.photoURL || "");
    }
  }, [currentUser]);

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      await updateProfile(currentUser, {
        displayName: editName,
        photoURL: editPhotoUrl
      });
      setIsEditing(false);
      window.location.reload();
    } catch (error) {
      console.error("Error updating profile", error);
    }
    setIsSaving(false);
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword) {
      setPasswordMessage("Please enter your current password.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordMessage("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage("New passwords do not match.");
      return;
    }
    setIsUpdatingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      
      await updatePassword(currentUser, newPassword);
      setPasswordMessage("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setIsChangingPassword(false);
        setPasswordMessage("");
      }, 2000);
    } catch (error) {
      console.error("Error updating password", error);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        setPasswordMessage("Incorrect current password.");
      } else if (error.code === 'auth/requires-recent-login') {
        setPasswordMessage("Please sign out and sign back in to change your password.");
      } else {
        setPasswordMessage("Failed to update password.");
      }
    }
    setIsUpdatingPassword(false);
  };

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const displayName = currentUser?.displayName || "Lasya Jetti";
  const email = currentUser?.email || "lasya@example.com";
  const initials = getInitials(displayName);

  const [toggles, setToggles] = useState(() => {
    try {
      const saved = localStorage.getItem('flowy_settings_toggles');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      publicListening: false,
      gapless: true,
      normalize: true,
      autoplay: false,
      spatialAudio: false,
      bassBoost: false,
      visualizer: true,
      dynamicBg: true,
      particles: true,
      haptic: true,
      smartDownloads: true,
      offlineMode: false,
      autoDelete: true,
      reduceMotion: false,
      highContrast: false,
      largerText: false,
      monoAudio: false,
      reduceParticles: false
    };
  });

  useEffect(() => {
    localStorage.setItem('flowy_settings_toggles', JSON.stringify(toggles));
    window.dispatchEvent(new Event('flowy_settings_changed'));
  }, [toggles]);

  const [crossfade, setCrossfade] = useState(() => {
    return Number(localStorage.getItem('flowy_settings_crossfade')) || 0;
  });

  useEffect(() => {
    localStorage.setItem('flowy_settings_crossfade', crossfade);
    window.dispatchEvent(new Event('flowy_settings_changed'));
  }, [crossfade]);

  const toggle = (key) => setToggles(prev => ({ ...prev, [key]: !prev[key] }));

  const icons = {
    user: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
    link: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>,
    creditCard: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>,
    share: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>,
    lock: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
    headphones: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" /></svg>,
    volume: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>,
    play: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>,
    layers: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 12 12 17 22 12" /><polyline points="2 17 12 22 22 17" /></svg>,
    zap: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
    activity: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
    image: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>,
    sparkles: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18" /><path d="M3 12h18" /><path d="M5.5 5.5l13 13" /><path d="M18.5 5.5l-13 13" /></svg>,
    smartphone: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>,
    download: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
    hardDrive: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="12" x2="2" y2="12" /><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /><line x1="6" y1="16" x2="6.01" y2="16" /><line x1="10" y1="16" x2="10.01" y2="16" /></svg>,
    trash: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>,
    eye: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
    type: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" /></svg>,
    info: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>,
    chevronRight: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
  };

  const tabs = [
    { id: 'account', label: 'Account', icon: icons.user },
    { id: 'playback', label: 'Playback', icon: icons.play },
    { id: 'audio', label: 'Audio Experience', icon: icons.activity },
    { id: 'storage', label: 'Storage', icon: icons.hardDrive },
    { id: 'accessibility', label: 'Accessibility', icon: icons.eye },
    { id: 'about', label: 'About', icon: icons.info }
  ];

  const panelVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.98 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 250, damping: 25 } },
    exit: { opacity: 0, y: -10, scale: 0.98, transition: { duration: 0.2 } }
  };

  return (
    <div className="settings-root">
      <div className="settings-bg" />
      <div className="settings-noise" />

      <header className="settings-header">
        <button className="settings-back" onClick={() => navigate(-1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <h1 className="settings-title">Settings</h1>
        <div style={{ width: 44 }}></div>
      </header>

      <div className="settings-content">
        
        {/* Sidebar */}
        <aside className="settings-sidebar">
          {tabs.map((tab) => (
            <button 
              key={tab.id}
              className={`sidebar-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="sidebar-tab-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </aside>

        {/* Main Content Area */}
        <main className="settings-main">
          <AnimatePresence mode="wait">
            
            {activeTab === 'account' && (
              <motion.section key="account" className="settings-section" variants={panelVariants} initial="hidden" animate="show" exit="exit">
                <h2 className="settings-section-title">Account</h2>
                <div className="account-profile-card">
                  <div className="profile-avatar-wrapper">
                    <div className="profile-aura"></div>
                    {currentUser?.photoURL ? (
                      <img src={currentUser.photoURL} alt="Profile" className="profile-avatar" />
                    ) : (
                      <div className="profile-avatar" style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #2a2a35, #1a1a24)', color: '#fff', fontSize: '32px', fontWeight: '600' }}>
                        {initials}
                      </div>
                    )}
                  </div>
                  <div className="profile-details" style={{ flexGrow: 1 }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Display Name" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '12px', borderRadius: '12px', fontSize: '15px', outline: 'none' }} />
                        <input type="text" value={editPhotoUrl} onChange={(e) => setEditPhotoUrl(e.target.value)} placeholder="Photo URL" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '12px', borderRadius: '12px', fontSize: '15px', outline: 'none' }} />
                        <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                          <button onClick={() => setIsEditing(false)} style={{ flex: 1, padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '500' }} onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.15)'} onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}>Cancel</button>
                          <button onClick={handleSaveProfile} disabled={isSaving} style={{ flex: 1, padding: '10px', borderRadius: '10px', background: 'var(--aurora-blue)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '500', opacity: isSaving ? 0.7 : 1 }} onMouseOver={(e) => { if (!isSaving) e.target.style.filter = 'brightness(1.1)' }} onMouseOut={(e) => e.target.style.filter = 'none'}>{isSaving ? "Saving..." : "Save"}</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h2>{displayName}</h2>
                          <p>{email}</p>
                        </div>
                        <button onClick={() => setIsEditing(true)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '8px 16px', borderRadius: '16px', cursor: 'pointer', transition: 'background 0.2s', fontWeight: '500' }} onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'} onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}>Edit</button>
                      </div>
                    )}
                  </div>
                </div>


                <div className="settings-grid">
                  <SettingsModule 
                    icon={icons.lock} 
                    title="Change Password" 
                    subtitle="Update your account password" 
                    onClick={() => setIsChangingPassword(true)} 
                    rightElement={icons.chevronRight} 
                  />
                </div>

                <button className="action-button" onClick={() => setShowLogoutConfirm(true)}>Sign Out</button>
              </motion.section>
            )}

            {activeTab === 'playback' && (
              <motion.section key="playback" className="settings-section" variants={panelVariants} initial="hidden" animate="show" exit="exit">
                <h2 className="settings-section-title">Playback</h2>
                <div className="settings-grid">
                  <SettingsModule
                    icon={icons.headphones}
                    title="Gapless Playback"
                    subtitle="Seamless transitions"
                    glowClass="icon-glow-blue"
                    rightElement={<FluidToggle active={toggles.gapless} onClick={() => toggle('gapless')} />}
                  />
                  <SettingsModule
                    icon={icons.volume}
                    title="Normalize Volume"
                    subtitle="Consistent audio levels"
                    rightElement={<FluidToggle active={toggles.normalize} onClick={() => toggle('normalize')} />}
                  />
                  <SettingsModule
                    icon={icons.play}
                    title="Auto-play Next"
                    subtitle="Endless listening"
                    rightElement={<FluidToggle active={toggles.autoplay} onClick={() => toggle('autoplay')} />}
                  />
                </div>
                <div className="settings-grid-wide">
                  <SettingsSlider
                    icon={icons.layers}
                    title="Crossfade"
                    subtitle="Overlap between tracks"
                    glowClass="icon-glow-pink"
                    min={0} max={12} value={crossfade} onChange={setCrossfade}
                    formatValue={(val) => val === 0 ? 'Off' : `${val}s`}
                  />
                </div>
              </motion.section>
            )}

            {activeTab === 'audio' && (
              <motion.section key="audio" className="settings-section" variants={panelVariants} initial="hidden" animate="show" exit="exit">
                <h2 className="settings-section-title">Audio Experience</h2>
                <div className="settings-grid">
                  <SettingsModule
                    icon={icons.layers}
                    title="Spatial Audio"
                    subtitle="Immersive 8D surround sound"
                    glowClass="icon-glow-blue"
                    rightElement={<FluidToggle active={toggles.spatialAudio} onClick={() => toggle('spatialAudio')} />}
                  />
                  <SettingsModule
                    icon={icons.zap}
                    title="Bass Boost"
                    subtitle="Enhance low frequencies"
                    glowClass="icon-glow-pink"
                    rightElement={<FluidToggle active={toggles.bassBoost} onClick={() => toggle('bassBoost')} />}
                  />

                  <SettingsModule
                    icon={icons.activity}
                    title="Audio Visualizer"
                    subtitle="Cinematic player graphics"
                    glowClass="icon-glow-peach"
                    rightElement={<FluidToggle active={toggles.visualizer} onClick={() => toggle('visualizer')} />}
                  >
                    <AnimatePresence>
                      {toggles.visualizer && (
                        <motion.div
                          className="preview-container"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 64 }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <div className="visualizer-preview">
                            <div className="vis-bar"></div><div className="vis-bar"></div><div className="vis-bar"></div>
                            <div className="vis-bar"></div><div className="vis-bar"></div><div className="vis-bar"></div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </SettingsModule>

                  <SettingsModule
                    icon={icons.sparkles}
                    title="Music Particles"
                    subtitle="Beat-reactive floaters"
                    glowClass="icon-glow-blue"
                    rightElement={<FluidToggle active={toggles.particles} onClick={() => toggle('particles')} />}
                  >
                    <AnimatePresence>
                      {toggles.particles && (
                        <motion.div
                          className="preview-container" style={{ background: 'transparent', border: 'none' }}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 64 }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <div className="particle-preview">
                            <div className="magic-particle p1"></div>
                            <div className="magic-particle p2"></div>
                            <div className="magic-particle p3"></div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </SettingsModule>

                  <SettingsModule
                    icon={icons.image}
                    title="Dynamic Ambient Art"
                    subtitle="Colors match current song"
                    rightElement={<FluidToggle active={toggles.dynamicBg} onClick={() => toggle('dynamicBg')} />}
                  />
                  <SettingsModule
                    icon={icons.smartphone}
                    title="Haptic Pulse"
                    subtitle="Physical beat feedback"
                    rightElement={<FluidToggle active={toggles.haptic} onClick={() => toggle('haptic')} />}
                  />
                </div>
              </motion.section>
            )}

            {activeTab === 'storage' && (
              <motion.section key="storage" className="settings-section" variants={panelVariants} initial="hidden" animate="show" exit="exit">
                <h2 className="settings-section-title">Downloads & Storage</h2>
                <div className="settings-grid-wide">
                  <div className="settings-module">
                    <div className="module-header">
                      <div className="module-icon icon-glow-blue">{icons.hardDrive}</div>
                      <div className="module-right"><span className="value-text">Manage</span></div>
                    </div>
                    <div className="storage-overview">
                      <div className="storage-text-row">
                        <div className="storage-free">24.5 GB <span>Free</span></div>
                      </div>
                      <div className="storage-meter-container">
                        <div className="storage-segment segment-music" style={{ width: '40%' }}></div>
                        <div className="storage-segment segment-cache" style={{ width: '15%' }}></div>
                      </div>
                      <div className="storage-legend">
                        <div className="legend-item"><div className="legend-dot music"></div> Downloads (5.2 GB)</div>
                        <div className="legend-item"><div className="legend-dot cache"></div> Cache (1.1 GB)</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="settings-grid">
                  <SettingsModule icon={icons.download} title="Download Quality" rightElement={<span className="value-text">High</span>} onClick={() => { }} />
                  <SettingsModule
                    icon={icons.zap}
                    title="Smart Downloads"
                    subtitle="Auto-cache favorites"
                    glowClass="icon-glow-peach"
                    rightElement={<FluidToggle active={toggles.smartDownloads} onClick={() => toggle('smartDownloads')} />}
                  />
                  <SettingsModule
                    icon={icons.smartphone}
                    title="Offline Mode"
                    subtitle="Only play downloaded"
                    rightElement={<FluidToggle active={toggles.offlineMode} onClick={() => toggle('offlineMode')} />}
                  />
                  <SettingsModule icon={icons.trash} title="Clear Cache" subtitle="Frees up space securely" onClick={() => { }} />
                  <SettingsModule
                    icon={icons.hardDrive}
                    title="Auto-delete Unused"
                    subtitle="Remove old downloads"
                    glowClass="icon-glow-pink"
                    rightElement={<FluidToggle active={toggles.autoDelete} onClick={() => toggle('autoDelete')} />}
                  />
                </div>
              </motion.section>
            )}

            {activeTab === 'accessibility' && (
              <motion.section key="accessibility" className="settings-section" variants={panelVariants} initial="hidden" animate="show" exit="exit">
                <h2 className="settings-section-title">Accessibility</h2>
                <div className="settings-grid">
                  <SettingsModule
                    icon={icons.eye}
                    title="Reduce Motion"
                    rightElement={<FluidToggle active={toggles.reduceMotion} onClick={() => toggle('reduceMotion')} />}
                  />
                  <SettingsModule
                    icon={icons.eye}
                    title="High Contrast"
                    rightElement={<FluidToggle active={toggles.highContrast} onClick={() => toggle('highContrast')} />}
                  />
                  <SettingsModule
                    icon={icons.type}
                    title="Larger Text"
                    rightElement={<FluidToggle active={toggles.largerText} onClick={() => toggle('largerText')} />}
                  />
                  <SettingsModule
                    icon={icons.headphones}
                    title="Mono Audio"
                    rightElement={<FluidToggle active={toggles.monoAudio} onClick={() => toggle('monoAudio')} />}
                  />
                  <SettingsModule
                    icon={icons.sparkles}
                    title="Reduced Particles"
                    rightElement={<FluidToggle active={toggles.reduceParticles} onClick={() => toggle('reduceParticles')} />}
                  />
                </div>
              </motion.section>
            )}

            {activeTab === 'about' && (
              <motion.section key="about" className="settings-section" variants={panelVariants} initial="hidden" animate="show" exit="exit">
                <h2 className="settings-section-title">About</h2>
                <div className="settings-grid">
                  <SettingsModule icon={icons.info} title="App Version" rightElement={<span className="value-text">1.4.2 (309)</span>} />
                  <SettingsModule icon={icons.layers} title="Credits" onClick={() => { }} />
                  <SettingsModule icon={icons.lock} title="Terms of Service" onClick={() => { }} />
                  <SettingsModule icon={icons.lock} title="Privacy Policy" onClick={() => { }} />
                  <SettingsModule icon={icons.info} title="Open Source Libraries" onClick={() => { }} />
                  <SettingsModule icon={icons.activity} title="Send Feedback" glowClass="icon-glow-blue" rightElement={icons.chevronRight} onClick={() => { }} />
                </div>
              </motion.section>
            )}

          </AnimatePresence>
        </main>

      </div>

      {/* Sleek Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div 
            className="logout-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLogoutConfirm(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <motion.div 
              className="logout-modal-content"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{ background: 'rgba(25,25,32,0.85)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '32px', maxWidth: '400px', width: '90%', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}
            >
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,69,58,0.1)', color: '#ff453a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '8px', color: '#fff' }}>Sign out of Flowy?</h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px', marginBottom: '32px', lineHeight: '1.5' }}>You will need to log back in to access your playlists, activity, and personalized recommendations.</p>
              <div style={{ display: 'flex', gap: '16px' }}>
                <button 
                  onClick={() => setShowLogoutConfirm(false)}
                  style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', fontWeight: '500', cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    setShowLogoutConfirm(false);
                    try {
                      await logout();
                      navigate('/auth');
                    } catch (error) {
                      console.error("Failed to log out", error);
                    }
                  }}
                  style={{ flex: 1, padding: '14px', borderRadius: '12px', background: '#ff453a', color: '#fff', border: 'none', fontWeight: '500', cursor: 'pointer', transition: 'background 0.2s, transform 0.2s', boxShadow: '0 4px 16px rgba(255,69,58,0.3)' }}
                  onMouseOver={(e) => { e.target.style.background = '#ff5b52'; e.target.style.transform = 'translateY(-2px)' }}
                  onMouseOut={(e) => { e.target.style.background = '#ff453a'; e.target.style.transform = 'translateY(0)' }}
                >
                  Sign Out
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isChangingPassword && (
          <motion.div 
            className="password-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setIsChangingPassword(false); setPasswordMessage(""); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }}
            style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <motion.div 
              className="password-modal-content"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{ background: 'rgba(25,25,32,0.85)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '32px', maxWidth: '400px', width: '90%', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}
            >
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '16px', color: '#fff' }}>Change Password</h2>
              
              <input 
                type="password" 
                value={currentPassword} 
                onChange={(e) => setCurrentPassword(e.target.value)} 
                placeholder="Current Password" 
                style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '14px', borderRadius: '12px', fontSize: '15px', outline: 'none', marginBottom: '12px' }} 
              />

              <input 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                placeholder="New Password (min 6 characters)" 
                style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '14px', borderRadius: '12px', fontSize: '15px', outline: 'none', marginBottom: '12px' }} 
              />
              
              <input 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                placeholder="Confirm New Password" 
                style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '14px', borderRadius: '12px', fontSize: '15px', outline: 'none', marginBottom: '16px' }} 
              />

              {passwordMessage && (
                <p style={{ color: passwordMessage.includes('successfully') ? '#4ade80' : '#ff453a', fontSize: '14px', marginBottom: '16px' }}>{passwordMessage}</p>
              )}

              <div style={{ display: 'flex', gap: '16px' }}>
                <button 
                  onClick={() => { setIsChangingPassword(false); setPasswordMessage(""); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }}
                  style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', fontWeight: '500', cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUpdatePassword}
                  disabled={isUpdatingPassword}
                  style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'var(--aurora-blue)', color: '#fff', border: 'none', fontWeight: '500', cursor: 'pointer', opacity: isUpdatingPassword ? 0.7 : 1, transition: 'background 0.2s, transform 0.2s' }}
                  onMouseOver={(e) => { if (!isUpdatingPassword) { e.target.style.filter = 'brightness(1.1)'; e.target.style.transform = 'translateY(-2px)' } }}
                  onMouseOut={(e) => { e.target.style.filter = 'none'; e.target.style.transform = 'translateY(0)' }}
                >
                  {isUpdatingPassword ? "Updating..." : "Update"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
