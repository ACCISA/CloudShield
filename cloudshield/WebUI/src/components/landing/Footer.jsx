import React from 'react';
import { Link } from 'react-router-dom';
import CloudshieldIcon from '../../assets/CloudshieldIcon.jsx';

const Footer = () => {
  return (
    <footer className="landing-footer">
      <div className="landing-footer-content">
        <div className="landing-footer-logo">
          <CloudshieldIcon width={24} height={24} />
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