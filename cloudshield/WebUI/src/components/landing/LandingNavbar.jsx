import React from 'react';
import { Link } from 'react-router-dom';
import cloudshieldLogo from '../../assets/cloudshield_logo_white.png';

const LandingNavbar = () => {
  return (
    <nav className="landing-navbar">
      <Link to="/" className="landing-logo">
        <img src={cloudshieldLogo} alt="CloudShield Logo" />
        CloudShield
      </Link>
      
      <div className="landing-nav-links">
        <a href="#features">Features</a>
        <a href="#pricing">Pricing</a>
        <a href="#contact">Contact Us</a>
      </div>
      
      <div className="landing-nav-actions">
        <Link to="/login" className="landing-login-btn">Log in</Link>
        <Link to="/signup" className="landing-trial-btn-sm">Start Free Trial</Link>
      </div>
    </nav>
  );
};

export default LandingNavbar;