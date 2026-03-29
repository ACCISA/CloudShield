import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PrimaryButton from '../PrimaryButton';

describe('PrimaryButton', () => {
  it('renders button with text', () => {
    render(<PrimaryButton>Click Me</PrimaryButton>);
    expect(screen.getByRole('button', { name: 'Click Me' })).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(<PrimaryButton onClick={handleClick}>Click Me</PrimaryButton>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is full width by default', () => {
    render(<PrimaryButton>Button</PrimaryButton>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('auth-btn');
    expect(button.style.width).toBe('');
  });

  it('can be rendered not full width', () => {
    render(<PrimaryButton fullWidth={false}>Button</PrimaryButton>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('auth-btn');
    expect(button).toHaveStyle({ width: 'auto' });
  });

  it('forwards additional button props', () => {
    render(<PrimaryButton disabled data-testid="primary-button">Disabled Button</PrimaryButton>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.getByTestId('primary-button')).toBeInTheDocument();
  });

  it('renders children correctly', () => {
    render(
      <PrimaryButton>
        <span>Complex</span> Content
      </PrimaryButton>
    );
    expect(screen.getByText('Complex')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});
