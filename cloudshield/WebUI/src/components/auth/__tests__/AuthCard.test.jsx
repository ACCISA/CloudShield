import React from 'react';
import { render, screen } from '@testing-library/react';
import AuthCard from '../AuthCard';

describe('AuthCard', () => {
  it('renders children correctly', () => {
    render(
      <AuthCard>
        <div>Form Content</div>
      </AuthCard>
    );
    expect(screen.getByText('Form Content')).toBeInTheDocument();
  });

  it('displays logo placeholder', () => {
    render(
      <AuthCard>
        <div>Content</div>
      </AuthCard>
    );
    expect(screen.getByText('LOGO')).toBeInTheDocument();
  });

  it('displays footer text', () => {
    render(
      <AuthCard>
        <div>Content</div>
      </AuthCard>
    );
    // Use the typographic apostrophe (U+2019) that's actually in the component
    expect(screen.getByText("Can’t log in?")).toBeInTheDocument();
    expect(screen.getByText('Secure Login with 2FA')).toBeInTheDocument();
  });

  it('applies correct styling', () => {
    const { container } = render(
      <AuthCard>
        <div>Content</div>
      </AuthCard>
    );
    const paper = container.querySelector('.MuiPaper-root');
    expect(paper).toBeInTheDocument();
  });
});
