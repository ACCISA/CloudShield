import React from 'react';
import { Link } from 'react-router-dom';

const HeroSection = () => {
  return (
    <header className="landing-hero">
      <div className="landing-hero-badge">
        New: CloudShield Pro is now available →
      </div>
      
      <h1 className="landing-hero-title">
        Secure Cloud Workspaces<br />for Modern Teams
      </h1>
      
      <p className="landing-hero-subtitle">
        Deploy high-performance virtual workstations in seconds. Enterprise-grade security with seamless collaboration built-in.
      </p>
      
      <div className="landing-hero-actions">
        <Link to="/signup" className="landing-trial-btn-lg">
          Start Free Trial
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>
        {/* Changed this anchor link to point to the #pricing id */}
        <a href="#pricing" className="landing-pricing-btn-lg">View Pricing</a>
      </div>
    </header>
  );
};

export default HeroSection;