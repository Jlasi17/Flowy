import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './AuthPage.css';

export default function AuthPage() {
  const [authMode, setAuthMode] = useState('email'); // 'email', 'phone'
  const [isLogin, setIsLogin] = useState(true); // only applies to email mode
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, signup, loginWithGoogle, setupRecaptcha, loginWithPhoneNumber } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/dashboard/bts";

  useEffect(() => {
    // Only set up recaptcha if we switch to phone mode and it hasn't been done yet
    if (authMode === 'phone' && !window.recaptchaVerifier) {
      try {
        setupRecaptcha('recaptcha-container');
      } catch (err) {
        console.error("Recaptcha setup error:", err);
      }
    }
  }, [authMode, setupRecaptcha]);

  async function handleEmailSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password);
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message.replace('Firebase:', '').trim());
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message.replace('Firebase:', '').trim());
    } finally {
      setLoading(false);
    }
  }

  async function handlePhoneSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const appVerifier = window.recaptchaVerifier;
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : '+' + phoneNumber;
      const confirmation = await loginWithPhoneNumber(formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
    } catch (err) {
      setError(err.message.replace('Firebase:', '').trim());
      // reset recaptcha if error
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.render().then(widgetId => {
          window.recaptchaTarget = widgetId;
          grecaptcha.reset(widgetId);
        }).catch(()=>{});
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifySubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await confirmationResult.confirm(verificationCode);
      navigate(from, { replace: true });
    } catch (err) {
      setError('Invalid code: ' + err.message.replace('Firebase:', '').trim());
    } finally {
      setLoading(false);
    }
  }

  const resetPhoneAuth = () => {
    setConfirmationResult(null);
    setVerificationCode('');
    setError('');
  };

  return (
    <div className="auth-page-container">
      <div className="auth-background-effects">
        <div className="auth-blob blob-1"></div>
        <div className="auth-blob blob-2"></div>
      </div>
      
      <motion.div 
        className="auth-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="auth-card-header">
          <motion.h2 
            key={confirmationResult ? 'verify' : (authMode === 'phone' ? 'phone' : (isLogin ? 'login' : 'signup'))}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="auth-title"
          >
            {confirmationResult 
              ? 'Verification' 
              : authMode === 'phone' 
                ? 'Phone Login' 
                : (isLogin ? 'Welcome Back' : 'Create Account')}
          </motion.h2>
          <p className="auth-subtitle">
            {confirmationResult
              ? `We sent a code to ${phoneNumber}`
              : 'Sign in to access your music and lyrics.'}
          </p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <div className="auth-mode-tabs" style={{ display: confirmationResult ? 'none' : 'flex' }}>
          <button 
            className={`auth-tab ${authMode === 'email' ? 'active' : ''}`}
            onClick={() => { setAuthMode('email'); setError(''); }}
          >
            Email
          </button>
          <button 
            className={`auth-tab ${authMode === 'phone' ? 'active' : ''}`}
            onClick={() => { setAuthMode('phone'); setError(''); }}
          >
            Phone
          </button>
        </div>

        <AnimatePresence mode="wait">
          {confirmationResult ? (
            <motion.form 
              key="verify"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleVerifySubmit} 
              className="auth-form"
            >
              <div className="auth-input-group">
                <input 
                  type="text" 
                  value={verificationCode} 
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  required
                />
              </div>
              <motion.button 
                type="submit" 
                className="auth-submit-btn"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </motion.button>
              <button type="button" className="auth-ghost-btn" onClick={resetPhoneAuth}>
                Use a different number
              </button>
            </motion.form>
          ) : authMode === 'phone' ? (
            <motion.form 
              key="phone"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handlePhoneSubmit} 
              className="auth-form"
            >
              <div className="auth-input-group">
                <input 
                  type="tel" 
                  value={phoneNumber} 
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Phone number (e.g., +1234567890)"
                  required
                />
              </div>
              <div id="recaptcha-container"></div>
              <motion.button 
                type="submit" 
                className="auth-submit-btn"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? 'Sending code...' : 'Send SMS Code'}
              </motion.button>
            </motion.form>
          ) : (
            <motion.form 
              key="email"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleEmailSubmit} 
              className="auth-form"
            >
              <div className="auth-input-group">
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  required
                />
              </div>
              <div className="auth-input-group">
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                />
              </div>
              
              <motion.button 
                type="submit" 
                className="auth-submit-btn"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Sign Up')}
              </motion.button>
              
              <div className="auth-toggle">
                <p>
                  {isLogin ? "Don't have an account?" : "Already have an account?"}
                  <button 
                    type="button"
                    className="auth-toggle-btn" 
                    onClick={() => setIsLogin(!isLogin)}
                  >
                    {isLogin ? 'Sign Up' : 'Log In'}
                  </button>
                </p>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {!confirmationResult && (
          <div className="auth-social">
            <div className="auth-divider">
              <span>OR</span>
            </div>
            <button 
              type="button" 
              className="auth-google-btn" 
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <svg width="20" height="20" viewBox="0 0 48 48" className="google-icon">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
              </svg>
              Sign in with Google
            </button>
            <button
              type="button"
              className="auth-ghost-btn"
              onClick={() => navigate(from, { replace: true })}
              style={{ marginTop: '20px' }}
            >
              Continue as guest
            </button>
          </div>
        )}

      </motion.div>
    </div>
  );
}
