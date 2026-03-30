import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SignupCard from '../SignupCard';

describe('SignupCard', () => {
  it('renders children correctly', () => {
    render(
      <SignupCard>
        <div data-testid="test-child">Test Content</div>
      </SignupCard>
    );

    expect(screen.getByTestId('test-child')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders logo image', () => {
    render(
      <SignupCard>
        <div>Content</div>
      </SignupCard>
    );

    const logo = screen.getByAltText('CloudShield');
    expect(logo).toBeInTheDocument();
    expect(logo.getAttribute('src')).toContain('cloudshield_logo_black.png');
  });

  it('applies the expected card and logo classes', () => {
    const { container } = render(
      <SignupCard>
        <div>Content</div>
      </SignupCard>
    );

    const card = container.firstChild;
    const logo = screen.getByAltText('CloudShield');
    expect(card).toHaveClass('auth-card');
    expect(logo).toHaveClass('auth-card__logo');
  });

  it('renders with multiple children', () => {
    render(
      <SignupCard>
        <div data-testid="child-1">First Child</div>
        <div data-testid="child-2">Second Child</div>
        <div data-testid="child-3">Third Child</div>
      </SignupCard>
    );

    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
    expect(screen.getByTestId('child-3')).toBeInTheDocument();
  });

  it('renders with no children', () => {
    const { container } = render(<SignupCard />);
    
    // Should still render the card structure and logo
    expect(screen.getByAltText('CloudShield')).toBeInTheDocument();
    expect(container.querySelector('.auth-card')).toBeInTheDocument();
  });

  it('renders the auth card body wrapper', () => {
    const { container } = render(
      <SignupCard>
        <div>Content</div>
      </SignupCard>
    );

    const body = container.querySelector('.auth-card__body');
    expect(body).toBeInTheDocument();
  });

  it('renders with complex nested children', () => {
    render(
      <SignupCard>
        <form data-testid="signup-form">
          <input type="text" placeholder="Email" />
          <input type="password" placeholder="Password" />
          <button type="submit">Submit</button>
        </form>
      </SignupCard>
    );

    expect(screen.getByTestId('signup-form')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  it('maintains the expected auth card structure', () => {
    const { container } = render(
      <SignupCard>
        <div data-testid="content">Content</div>
      </SignupCard>
    );

    expect(container.querySelector('.auth-card')).toBeInTheDocument();
    expect(container.querySelector('.auth-card__body')).toBeInTheDocument();
  });

  it('renders correctly when children is a string', () => {
    render(<SignupCard>Simple text content</SignupCard>);

    expect(screen.getByText('Simple text content')).toBeInTheDocument();
  });

  it('renders correctly when children is a fragment', () => {
    render(
      <SignupCard>
        <>
          <div data-testid="fragment-child-1">Fragment 1</div>
          <div data-testid="fragment-child-2">Fragment 2</div>
        </>
      </SignupCard>
    );

    expect(screen.getByTestId('fragment-child-1')).toBeInTheDocument();
    expect(screen.getByTestId('fragment-child-2')).toBeInTheDocument();
  });

  it('handles null children gracefully', () => {
    const { container } = render(<SignupCard>{null}</SignupCard>);

    expect(screen.getByAltText('CloudShield')).toBeInTheDocument();
    expect(container.querySelector('.auth-card')).toBeInTheDocument();
  });

  it('handles undefined children gracefully', () => {
    const { container } = render(<SignupCard>{undefined}</SignupCard>);

    expect(screen.getByAltText('CloudShield')).toBeInTheDocument();
    expect(container.querySelector('.auth-card')).toBeInTheDocument();
  });
});
