import React from 'react';
import LandingNavbar from '../components/landing/LandingNavbar.jsx';
import HeroSection from '../components/landing/HeroSection.jsx';
import PricingSection from '../components/landing/PricingSection.jsx';
import ContactSection from '../components/landing/ContactSection.jsx';
import Footer from '../components/landing/Footer.jsx';
import './LandingPage.css';

const LandingPage = () => {
  return (
    <div className="landing-container">
      {/* Background glowing effects */}
      <div className="landing-glow-purple"></div>
      <div className="landing-glow-blue"></div>

      {/* Page Sections */}
      <LandingNavbar />
      <HeroSection />
      
      {/* Dashboard Preview Section */}
      {/* Added id="features" right here so the navbar link can find it */}
      <section id="features" className="landing-dashboard-preview">
        <div className="landing-dashboard-mockup">
          [ Dashboard Preview Mockup ]
        </div>
      </section>

      {/* New Sections */}
      <PricingSection />
      <ContactSection />
      <Footer />
    </div>
  );
};

export default LandingPage;