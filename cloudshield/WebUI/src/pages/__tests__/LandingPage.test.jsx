import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LandingPage from '../LandingPage';

describe('LandingPage Component', () => {
  it('renders without crashing', () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );
    expect(screen.getByText(/Secure Cloud Workspaces/i)).toBeInTheDocument();
  });
});