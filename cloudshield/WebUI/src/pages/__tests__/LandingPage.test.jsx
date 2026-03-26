import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LandingPage from '../LandingPage';

describe('LandingPage Component', () => {
  function renderPage() {
    return render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );
  }

  it('renders without crashing', () => {
    renderPage();
    expect(screen.getByText(/Secure Cloud Workspaces/i)).toBeInTheDocument();
  });

  it('renders the landing container and dashboard preview section', () => {
    renderPage();

    expect(screen.getByTestId('landing-container')).toBeInTheDocument();
    expect(screen.getByTestId('features-section')).toBeInTheDocument();
  });

  it('renders decorative background glow elements', () => {
    renderPage();

    expect(screen.getByTestId('landing-glow-purple')).toBeInTheDocument();
    expect(screen.getByTestId('landing-glow-blue')).toBeInTheDocument();
  });

  describe('Dashboard Carousel Integration', () => {
    it('renders the carousel component', () => {
      renderPage();

      expect(screen.getByLabelText('Previous slide')).toBeInTheDocument();
      expect(screen.getByLabelText('Next slide')).toBeInTheDocument();
    });

    it('renders carousel section with title and subtitle', () => {
      renderPage();

      expect(screen.getByText('Explore Our Dashboard')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Navigate through the different features and management interfaces'
        )
      ).toBeInTheDocument();
    });

    it('renders all carousel slides', () => {
      renderPage();

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Users Management')).toBeInTheDocument();
      expect(screen.getByText('Groups Management')).toBeInTheDocument();
      expect(screen.getByText('File Management')).toBeInTheDocument();
      expect(screen.getByText('Workstations')).toBeInTheDocument();
    });

    it('renders carousel navigation dots', () => {
      renderPage();

      const dots = screen.getAllByLabelText(/Go to slide/);
      expect(dots).toHaveLength(5);
    });

    it('carousel section has correct structure', () => {
      const { container } = renderPage();

      const featuresSection = screen.getByTestId('features-section');
      expect(featuresSection).toBeInTheDocument();
      expect(featuresSection.id).toBe('features');

      const carouselContainer = featuresSection.querySelector('.dashboard-carousel');
      expect(carouselContainer).toBeInTheDocument();
    });
  });

  describe('PageShell noPadding prop', () => {
    it('renders PageShell with noPadding prop for landing page', () => {
      const { container } = renderPage();

      // The landing page should render without padding
      const landingContainer = screen.getByTestId('landing-container');
      expect(landingContainer).toBeInTheDocument();
    });
  });
});
