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
    expect(screen.getByText(/\[ Dashboard Preview Mockup \]/i)).toBeInTheDocument();
  });

  it('renders decorative background glow elements', () => {
    renderPage();

    expect(screen.getByTestId('landing-glow-purple')).toBeInTheDocument();
    expect(screen.getByTestId('landing-glow-blue')).toBeInTheDocument();
  });
});