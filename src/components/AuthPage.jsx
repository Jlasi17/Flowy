import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './AuthPage.css';

import { groupsData } from '../data/musicRegistry';

// ── Derive all album covers dynamically from the music registry ───────
// Every new album added to any data file is picked up automatically.
function buildAlbumCovers() {
  const covers = new Set();

  Object.values(groupsData).forEach(group => {
    // Group albums (nested: yearBuckets → albums[])
    (group.albums || []).forEach(bucket => {
      (bucket.albums || []).forEach(album => {
        if (album.cover) covers.add(album.cover);
      });
    });

    // Solo albums (nested: memberBuckets → albums[])
    (group.soloAlbums || []).forEach(member => {
      (member.albums || []).forEach(album => {
        if (album.cover) covers.add(album.cover);
      });
    });
  });

  return [...covers];
}

const ALBUM_COVERS = buildAlbumCovers();

// Preload all images so they appear instantly with no flicker
ALBUM_COVERS.forEach(src => { const img = new Image(); img.src = src; });



const TRAIL_LIFETIME = 1400; // ms — matches @keyframes trail-life duration
const MIN_DISTANCE   = 16;   // px — tight enough for a continuous ribbon
const MAX_TRAIL      = 30;   // soft cap: oldest evicted, never blocks

export default function AuthPage() {
  const [authMode, setAuthMode] = useState('email');
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ── Direct-DOM trail (no React state — zero re-renders) ───
  const trailLayerRef  = useRef(null);   // the container div
  const lastPosRef     = useRef({ x: -9999, y: -9999 });
  const rafRef         = useRef(null);
  const rawMouseRef    = useRef({ x: 0, y: 0 });
  const mouseOnCardRef = useRef(false);
  const lastPicksRef  = useRef(new Set()); // recent-seen buffer, avoids back-to-back repeats
  // no live-count ref needed — DOM childElementCount is the source of truth

  const { login, signup, loginWithGoogle, setupRecaptcha, loginWithPhoneNumber } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard/bts';

  useEffect(() => {
    if (authMode === 'phone' && !window.recaptchaVerifier) {
      try { setupRecaptcha('recaptcha-container'); } catch (e) { console.error(e); }
    }
  }, [authMode, setupRecaptcha]);

  // Spawn one album cover — CSS @keyframes handles the full lifecycle
  const spawnItem = useCallback((x, y) => {
    const layer = trailLayerRef.current;
    if (!layer) return;

    // FIFO eviction: remove oldest instead of blocking — trail NEVER stops
    while (layer.childElementCount >= MAX_TRAIL) {
      const oldest = layer.firstElementChild;
      if (oldest?._cleanup) oldest._cleanup();
      else oldest?.remove();
    }

    // Pick a random cover, avoiding the last ~8 picks so variety is instant
    let src;
    const seen = lastPicksRef.current;
    const candidates = ALBUM_COVERS.filter(c => !seen.has(c));
    src = (candidates.length > 0 ? candidates : ALBUM_COVERS)[
      Math.floor(Math.random() * (candidates.length || ALBUM_COVERS.length))
    ];
    seen.add(src);
    if (seen.size > Math.min(8, Math.floor(ALBUM_COVERS.length / 3))) {
      // remove oldest entry to keep the buffer small
      seen.delete(seen.values().next().value);
    }

    const rotate = (Math.random() - 0.5) * 30;         // –15 → +15 deg
    const size   = Math.round(80 + Math.random() * 50); // 80–130 px

    const el = document.createElement('div');
    el.className = 'trail-item';
    el.style.cssText =
      `left:${x}px;top:${y}px;width:${size}px;height:${size}px;--rotate:${rotate}deg;`;

    const img = document.createElement('img');
    img.src  = src;
    img.draggable = false;
    img.alt  = '';
    el.appendChild(img);
    layer.appendChild(el);

    // Remove after animation finishes — CSS drives everything in between
    const timer = setTimeout(() => el.remove(), TRAIL_LIFETIME);
    el._cleanup = () => { clearTimeout(timer); el.remove(); };
  }, []);

  // rAF loop — samples rawMouseRef, spawns on distance threshold
  const tick = useCallback(() => {
    if (!mouseOnCardRef.current) {
      const { x, y } = rawMouseRef.current;
      const dx = x - lastPosRef.current.x;
      const dy = y - lastPosRef.current.y;
      if (Math.sqrt(dx * dx + dy * dy) >= MIN_DISTANCE) {
        spawnItem(x, y);
        lastPosRef.current = { x, y };
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [spawnItem]);

  const handleMouseMove = useCallback((e) => {
    rawMouseRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      // Clean up any in-flight trail items
      if (trailLayerRef.current) {
        Array.from(trailLayerRef.current.children).forEach(c => c._cleanup?.());
      }
    };
  }, [tick]);

  // ── Auth handlers ─────────────────────────────────────────
  async function handleEmailSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      isLogin ? await login(email, password) : await signup(email, password);
      navigate(from, { replace: true });
    } catch (err) { setError(err.message.replace('Firebase:', '').trim()); }
    finally { setLoading(false); }
  }

  async function handleGoogleLogin() {
    setError(''); setLoading(true);
    try { await loginWithGoogle(); navigate(from, { replace: true }); }
    catch (err) { setError(err.message.replace('Firebase:', '').trim()); }
    finally { setLoading(false); }
  }

  async function handlePhoneSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const phone = phoneNumber.startsWith('+') ? phoneNumber : '+' + phoneNumber;
      const conf = await loginWithPhoneNumber(phone, window.recaptchaVerifier);
      setConfirmationResult(conf);
    } catch (err) {
      setError(err.message.replace('Firebase:', '').trim());
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.render()
          .then(w => grecaptcha.reset(w))
          .catch(() => { });
      }
    } finally { setLoading(false); }
  }

  async function handleVerifySubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try { await confirmationResult.confirm(verificationCode); navigate(from, { replace: true }); }
    catch (err) { setError('Invalid code: ' + err.message.replace('Firebase:', '').trim()); }
    finally { setLoading(false); }
  }

  const resetPhoneAuth = () => {
    setConfirmationResult(null);
    setVerificationCode('');
    setError('');
  };

  return (
    <div className="auth-page-container" onMouseMove={handleMouseMove}>

      {/* ── Ambient orbs ── */}
      <div className="auth-bg-layer" aria-hidden="true">
        <div className="auth-orb orb-1" />
        <div className="auth-orb orb-2" />
        <div className="auth-orb orb-3" />
        <div className="auth-noise" />
      </div>

      {/* ── Album trail — direct DOM, zero React re-renders ── */}
      <div className="auth-trail-layer" aria-hidden="true" ref={trailLayerRef} />

      {/* ── Glass card ── */}
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 36, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        onMouseEnter={() => { mouseOnCardRef.current = true; }}
        onMouseLeave={() => { mouseOnCardRef.current = false; }}
      >

        {/* Title */}
        <div className="auth-card-header">
          <AnimatePresence mode="wait">
            <motion.h2
              key={confirmationResult ? 'verify' : (authMode === 'phone' ? 'phone' : (isLogin ? 'login' : 'signup'))}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3 }}
              className="auth-title"
            >
              {confirmationResult
                ? 'Enter Your Code'
                : authMode === 'phone'
                  ? 'Phone Sign In'
                  : isLogin ? 'Welcome Back 🎵' : 'Join the Flow 🌊'}
            </motion.h2>
          </AnimatePresence>
          <p className="auth-subtitle">
            {confirmationResult ? `Code sent to ${phoneNumber}` : 'Stream, sync, and feel the music.'}
          </p>
        </div>

        {error && (
          <motion.div className="auth-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {error}
          </motion.div>
        )}

        {/* Mode tabs */}
        {!confirmationResult && (
          <div className="auth-mode-tabs">
            <button
              className={`auth-tab ${authMode === 'email' ? 'active' : ''}`}
              onClick={() => { setAuthMode('email'); setError(''); }}
            >
              📧 Email
            </button>
            <button
              className={`auth-tab ${authMode === 'phone' ? 'active' : ''}`}
              onClick={() => { setAuthMode('phone'); setError(''); }}
            >
              📱 Phone
            </button>
          </div>
        )}

        {/* Forms */}
        <AnimatePresence mode="wait">
          {confirmationResult ? (
            <motion.form key="verify"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.28 }} onSubmit={handleVerifySubmit} className="auth-form"
            >
              <div className="auth-input-group">
                <span className="input-icon">🔑</span>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={e => setVerificationCode(e.target.value)}
                  placeholder="6-digit code"
                  required maxLength={6}
                />
              </div>
              <motion.button type="submit" className="auth-submit-btn" disabled={loading}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                {loading ? <span className="btn-spinner" /> : 'Verify Code'}
              </motion.button>
              <button type="button" className="auth-ghost-btn" onClick={resetPhoneAuth}>
                ← Different number
              </button>
            </motion.form>

          ) : authMode === 'phone' ? (
            <motion.form key="phone"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.28 }} onSubmit={handlePhoneSubmit} className="auth-form"
            >
              <div className="auth-input-group">
                <span className="input-icon">📞</span>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  placeholder="+1 234 567 8900"
                  required
                />
              </div>
              <div id="recaptcha-container" />
              <motion.button type="submit" className="auth-submit-btn" disabled={loading}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                {loading ? <span className="btn-spinner" /> : 'Send SMS Code'}
              </motion.button>
            </motion.form>

          ) : (
            <motion.form key="email"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.28 }} onSubmit={handleEmailSubmit} className="auth-form"
            >
              <div className="auth-input-group">
                <span className="input-icon">✉️</span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email address"
                  required
                />
              </div>
              <div className="auth-input-group">
                <span className="input-icon">🔒</span>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                />
              </div>
              <motion.button type="submit" className="auth-submit-btn" disabled={loading}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                {loading ? <span className="btn-spinner" /> : (isLogin ? 'Log In' : 'Create Account')}
              </motion.button>
              <div className="auth-toggle">
                <p>
                  {isLogin ? "Don't have an account?" : 'Already have an account?'}
                  <button type="button" className="auth-toggle-btn" onClick={() => setIsLogin(!isLogin)}>
                    {isLogin ? 'Sign Up' : 'Log In'}
                  </button>
                </p>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Social */}
        {!confirmationResult && (
          <div className="auth-social">
            <div className="auth-divider"><span>or</span></div>
            <motion.button type="button" className="auth-google-btn"
              onClick={handleGoogleLogin} disabled={loading}
              whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.97 }}>
              <svg width="20" height="20" viewBox="0 0 48 48" className="google-icon">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              Continue with Google
            </motion.button>
            <button type="button" className="auth-ghost-btn"
              onClick={() => navigate(location.state?.from?.pathname || '/', { replace: true })}>
              Continue as guest →
            </button>
          </div>
        )}

        <div className="auth-card-glow-strip" />
      </motion.div>
    </div>
  );
}