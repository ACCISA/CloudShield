import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LandingNavbar from '../LandingNavbar';

describe('LandingNavbar Component', () => {
  it('renders navbar links correctly', () => {
    render(
      <BrowserRouter>
        <LandingNavbar />
      </BrowserRouter>
    );
    expect(screen.getByText(/Log in/i)).toBeInTheDocument();
  });
});