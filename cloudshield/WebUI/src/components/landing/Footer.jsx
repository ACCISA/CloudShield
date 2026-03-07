import React from 'react';
import { Link } from 'react-router-dom';
import cloudshieldLogo from '../../assets/cloudshield_logo_white.png';

const Footer = () => {
  return (
    <footer className="landing-footer">
      <div className="landing-footer-content">
        <div className="landing-footer-logo">
          <img src={cloudshieldLogo} alt="CloudShield Logo" style={{ height: '24px' }} />
          CloudShield
        </div>
        
        <div className="landing-footer-links">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#contact">Contact</a>
          <Link to="/login">Login</Link>
        </div>
      </div>
      
      <div className="landing-footer-bottom">
        &copy; {new Date().getFullYear()} CloudShield Inc. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;