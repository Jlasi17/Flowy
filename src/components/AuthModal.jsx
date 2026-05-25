import React, { useContext, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AudioContext } from '../AudioPlayerProvider';
import './AuthModal.css';

export default function AuthModal() {
  const { isAuthModalOpen, setIsAuthModalOpen } = useContext(AudioContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isAuthModalOpen) {
      setIsVisible(true);
      // Prevent scrolling on body
      document.body.style.overflow = 'hidden';
    } else {
      setTimeout(() => setIsVisible(false), 300);
      document.body.style.overflow = '';
    }
  }, [isAuthModalOpen]);

  if (!isAuthModalOpen && !isVisible) return null;

  const handleLoginClick = () => {
    setIsAuthModalOpen(false);
    navigate('/auth', { state: { from: location.pathname } });
  };

  return (
    <div className={`auth-modal-overlay ${isAuthModalOpen ? 'open' : ''}`} onClick={() => setIsAuthModalOpen(false)}>
      <div className="auth-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="auth-modal-icon-wrapper">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h2 className="auth-modal-title">Feature Locked</h2>
        <p className="auth-modal-desc">
          To unlock this feature, please log in or sign up. Join the Flowy community to enjoy the full experience!
        </p>
        <div className="auth-modal-actions">
          <button className="auth-modal-cancel-btn" onClick={() => setIsAuthModalOpen(false)}>
            Cancel
          </button>
          <button className="auth-modal-login-btn" onClick={handleLoginClick}>
            Log In
          </button>
        </div>
      </div>
    </div>
  );
}
