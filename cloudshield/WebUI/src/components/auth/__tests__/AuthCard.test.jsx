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

  it('displays the CloudShield logo', () => {
    const { container } = render(
      <AuthCard>
        <div>Content</div>
      </AuthCard>
    );
    const logo = container.querySelector('.auth-card__logo');
    expect(logo).toBeInTheDocument();
    expect(logo.tagName.toLowerCase()).toBe('svg');
  });

  it('displays the login title and subtitle', () => {
    render(
      <AuthCard>
        <div>Content</div>
      </AuthCard>
    );
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByText('Sign in to your CloudShield account')).toBeInTheDocument();
  });

  it('applies the auth card classes', () => {
    const { container } = render(
      <AuthCard>
        <div>Content</div>
      </AuthCard>
    );
    const card = container.firstChild;
    expect(card).toHaveClass('auth-card', 'auth-card--login');
    expect(container.querySelector('.auth-card__body')).toBeInTheDocument();
  });
});
