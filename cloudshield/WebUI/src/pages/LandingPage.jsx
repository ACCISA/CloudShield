import React from 'react';
import LandingNavbar from '../components/landing/LandingNavbar';
import HeroSection from '../components/landing/HeroSection';
import PricingSection from '../components/landing/PricingSection';
import ContactSection from '../components/landing/ContactSection';
import Footer from '../components/landing/Footer';
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
      <section className="landing-dashboard-preview">
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