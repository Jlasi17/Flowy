import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [activeTab, setActiveTab] = useState('account');

  const [toggles, setToggles] = useState({
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
  });

  const [crossfade, setCrossfade] = useState(0);

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
                    <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="Profile" className="profile-avatar" />
                  </div>
                  <div className="profile-details">
                    <h2>Lasya Jetti</h2>
                    <p>lasya@example.com</p>
                  </div>
                </div>

                <div className="settings-grid">
                  <SettingsModule icon={icons.creditCard} title="Subscription Plan" subtitle="Premium Member" glowClass="icon-glow-peach" rightElement={<span className="value-text">Manage</span>} onClick={() => { }} />
                  <SettingsModule icon={icons.link} title="Connected Accounts" subtitle="Manage integrations" rightElement={icons.chevronRight} onClick={() => { }} />
                  <SettingsModule icon={icons.share} title="Share Profile" subtitle="Your listening ID" rightElement={icons.chevronRight} onClick={() => { }} />
                  <SettingsModule
                    icon={icons.lock}
                    title="Public Profile"
                    subtitle="Let others see your activity"
                    rightElement={<FluidToggle active={toggles.publicListening} onClick={() => toggle('publicListening')} />}
                  />
                </div>

                <button className="action-button">Sign Out</button>
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
    </div>
  );
}
