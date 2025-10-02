import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('DesktopUI basic UI', () => {
  test('shows Learn React link', () => {
    render(<App />);
    const link = screen.getByText(/learn react/i);
    expect(link).toBeInTheDocument();
  });

  test('renders logo with alt text', () => {
    render(<App />);
    const img = screen.getByAltText(/logo/i);
    expect(img).toBeInTheDocument();
  });
});
