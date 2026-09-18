import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// ─── Atmospheric Gradient & Structural Line Field ─────────────────────────────
// System 1: Animated Gradient Light Field (soft drifting blue gradient masses)
// System 2: Structural SVG Line Field (restrained sweeping topological paths)
// Pure SVG + CSS transforms — 100% lightweight, no nodes/dots, no WebGL/canvas.

function AtmosphericField() {
  return (
    <div className="entry-atmosphere" aria-hidden="true">
      {/* ── System 1: Animated Gradient Light Field ── */}
      <div className="entry-light-field">
        <div className="entry-light-mass entry-light-mass--primary" />
        <div className="entry-light-mass entry-light-mass--secondary" />
        <div className="entry-light-mass entry-light-mass--ambient" />
      </div>

      {/* ── System 2: Structural SVG Line Field ── */}
      <svg
        viewBox="0 0 700 600"
        preserveAspectRatio="xMidYMid meet"
        className="entry-line-canvas"
        role="presentation"
      >
        <defs>
          {/* Radial fade mask to seamlessly dissolve paths into dark navy background */}
          <radialGradient id="lineFadeMask" cx="60%" cy="50%" r="55%">
            <stop offset="25%" stopColor="#fff" stopOpacity="1" />
            <stop offset="65%" stopColor="#fff" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <mask id="lineMask">
            <rect width="700" height="600" fill="url(#lineFadeMask)" />
          </mask>

          {/* Path Gradient 1: Institutional steel blue to sky */}
          <linearGradient id="pathGrad1" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2570cc" stopOpacity="0" />
            <stop offset="30%" stopColor="#2570cc" stopOpacity="0.3" />
            <stop offset="60%" stopColor="#38bdf8" stopOpacity="0.5" />
            <stop offset="85%" stopColor="#60a5fa" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#0f396b" stopOpacity="0" />
          </linearGradient>

          {/* Path Gradient 2: Subtle deep azure counter-sweep */}
          <linearGradient id="pathGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e40af" stopOpacity="0" />
            <stop offset="35%" stopColor="#3b82f6" stopOpacity="0.35" />
            <stop offset="70%" stopColor="#2570cc" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0" />
          </linearGradient>

          {/* Path Gradient 3: Faint harmonic chord */}
          <linearGradient id="pathGrad3" x1="10%" y1="80%" x2="90%" y2="20%">
            <stop offset="0%" stopColor="#2570cc" stopOpacity="0" />
            <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#2570cc" stopOpacity="0" />
          </linearGradient>

          {/* Traveling Light Highlight Gradient */}
          <linearGradient id="travelHighlightGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
            <stop offset="50%" stopColor="#bae6fd" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </linearGradient>
        </defs>

        <g mask="url(#lineMask)">
          {/* Structural Line 1: Primary sweeping architectural arc */}
          <path
            d="M 30,510 C 180,440 330,320 460,180 C 530,100 600,40 680,20"
            fill="none"
            stroke="url(#pathGrad1)"
            strokeWidth="1.0"
            className="entry-line-path entry-line-path--1"
          />

          {/* Subtle traveling highlight pulse along Primary Arc */}
          <path
            d="M 30,510 C 180,440 330,320 460,180 C 530,100 600,40 680,20"
            fill="none"
            stroke="url(#travelHighlightGrad)"
            strokeWidth="1.5"
            strokeDasharray="90 850"
            className="entry-line-pulse"
          />

          {/* Structural Line 2: Counter-flow trajectory curve */}
          <path
            d="M 80,70 C 220,160 370,260 500,390 C 570,460 630,510 690,550"
            fill="none"
            stroke="url(#pathGrad2)"
            strokeWidth="0.85"
            className="entry-line-path entry-line-path--2"
          />

          {/* Structural Line 3: Topological elevation contour */}
          <path
            d="M 60,420 C 210,360 360,270 480,200 C 560,150 630,120 690,110"
            fill="none"
            stroke="url(#pathGrad3)"
            strokeWidth="0.7"
            className="entry-line-path entry-line-path--3"
          />

          {/* Structural Line 4: Secondary inner flow arc */}
          <path
            d="M 140,120 C 270,220 400,300 520,400 C 580,450 640,480 690,500"
            fill="none"
            stroke="url(#pathGrad1)"
            strokeWidth="0.65"
            opacity="0.6"
            className="entry-line-path entry-line-path--4"
          />

          {/* Structural Line 5: Extended data-horizon curve */}
          <path
            d="M 20,270 C 180,240 370,230 540,270 C 620,290 670,330 700,370"
            fill="none"
            stroke="url(#pathGrad2)"
            strokeWidth="0.55"
            opacity="0.5"
            className="entry-line-path entry-line-path--5"
          />
        </g>
      </svg>
    </div>
  );
}

// ─── Entry Page Component ─────────────────────────────────────────────────────

const Entry: React.FC = () => {
  const navigate = useNavigate();
  const { authStatus, user } = useAuth();
  const [isExiting, setIsExiting] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const ctaRef = useRef<HTMLButtonElement>(null);

  // Redirect already-authenticated admins directly into the portal
  useEffect(() => {
    if (authStatus === 'AUTHORIZED' && user) {
      navigate('/', { replace: true });
    }
  }, [authStatus, user, navigate]);

  // Small delay before triggering entrance — lets background render first
  useEffect(() => {
    const t = setTimeout(() => setIsReady(true), 40);
    return () => clearTimeout(t);
  }, []);

  const handleEnter = () => {
    if (isExiting) return;
    setIsExiting(true);
    // Brief exit transition, then navigate
    setTimeout(() => navigate('/login'), 320);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleEnter();
    }
  };

  // While auth is still initializing (returning user check), render nothing
  // so we don't flash the entry page before redirecting
  if (authStatus === 'INITIALIZING' || authStatus === 'PROFILE_LOADING') {
    return null;
  }

  return (
    <div
      className={`entry-root${isReady ? ' entry-root--ready' : ''}${isExiting ? ' entry-root--exiting' : ''}`}
      role="main"
    >
      {/* ── Background layers ── */}
      <div className="entry-bg" aria-hidden="true">
        <div className="entry-bg__radial" />
        <div className="entry-bg__grid" />
      </div>

      {/* ── Atmospheric gradient & structural line field — right side ── */}
      <div className="entry-artwork-wrap" aria-hidden="true">
        <AtmosphericField />
      </div>

      {/* ── Primary content — left ── */}
      <div className="entry-content">
        {/* Institutional identifier */}
        <div className="entry-eyebrow">
          <div className="entry-eyebrow__mark" aria-hidden="true" />
          <span>RNS Institute of Technology</span>
        </div>

        {/* Primary title */}
        <h1 className="entry-title">
          <span className="entry-title__line1">Alumni</span>
          <span className="entry-title__line2">Intelligence</span>
        </h1>

        {/* Single supporting statement — one sentence, nothing more */}
        <p className="entry-statement">
          Insight across the RNSIT alumni network.
        </p>

        {/* CTA — one action, clearly primary */}
        <div className="entry-actions">
          <button
            ref={ctaRef}
            onClick={handleEnter}
            onKeyDown={handleKeyDown}
            className="entry-cta"
            aria-label="Enter the RNSIT Alumni Intelligence portal"
          >
            <span>Enter Alumni Portal</span>
            <ArrowRight
              size={16}
              className="entry-cta__arrow"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Entry;
