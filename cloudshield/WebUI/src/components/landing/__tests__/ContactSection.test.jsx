import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ContactSection from '../ContactSection.jsx';

describe('ContactSection Component', () => {
  it('renders all contact form fields and headers', () => {
    render(<ContactSection />);
    
    // Check headers
    expect(screen.getByText(/Get in/i)).toBeInTheDocument();
    
    // Check input fields
    expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Message/i)).toBeInTheDocument();
    
    // Check button
    expect(screen.getByRole('button', { name: /Send Message/i })).toBeInTheDocument();
  });

  it('prevents default form submission action', () => {
    render(<ContactSection />);
    
    const submitButton = screen.getByRole('button', { name: /Send Message/i });
    const form = submitButton.closest('form');
    
    let defaultPrevented = false;
    
    // Fire the submit event and mock the preventDefault function
    fireEvent.submit(form, {
      preventDefault: () => { defaultPrevented = true; }
    });
    
    // Verify the conditional logic for onSubmit fired correctly
    expect(defaultPrevented).toBe(true);
  });
});