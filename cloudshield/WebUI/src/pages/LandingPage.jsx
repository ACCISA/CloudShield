import React from 'react';
import PageShell from '../components/layout/PageShell.jsx';
import LandingNavbar from '../components/landing/LandingNavbar.jsx';
import HeroSection from '../components/landing/HeroSection.jsx';
import PricingSection from '../components/landing/PricingSection.jsx';
import ContactSection from '../components/landing/ContactSection.jsx';
import Footer from '../components/landing/Footer.jsx';
import './LandingPage.css';

const LandingPage = () => {
  return (
    <PageShell>
      <div className="landing-container" data-testid="landing-container">
        {/* Background glowing effects */}
        <div
          className="landing-glow-purple"
          data-testid="landing-glow-purple"
          aria-hidden="true"
        />
        <div
          className="landing-glow-blue"
          data-testid="landing-glow-blue"
          aria-hidden="true"
        />

        {/* Page Sections */}
        <LandingNavbar />
        <HeroSection />

        {/* Dashboard Preview Section */}
        <section
          id="features"
          className="landing-dashboard-preview"
          data-testid="features-section"
        >
          <div className="landing-dashboard-mockup">
            [ Dashboard Preview Mockup ]
          </div>
        </section>

        <PricingSection />
        <ContactSection />
        <Footer />
      </div>
    </PageShell>
  );
};

export default LandingPage;