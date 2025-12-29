import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TwoFactorOptionItem from '../TwoFactorOptionItem';

describe('TwoFactorOptionItem', () => {
  const mockOnClick = jest.fn();

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  it('renders with title', () => {
    render(
      <TwoFactorOptionItem
        type="sms"
        title="SMS"
        onClick={mockOnClick}
      />
    );
    expect(screen.getByText('SMS')).toBeInTheDocument();
  });

  it('renders with title and subtitle', () => {
    render(
      <TwoFactorOptionItem
        type="sms"
        title="SMS"
        subtitle="+1 *** *** 1234"
        onClick={mockOnClick}
      />
    );
    expect(screen.getByText('SMS')).toBeInTheDocument();
    expect(screen.getByText('+1 *** *** 1234')).toBeInTheDocument();
  });

  it('renders without subtitle when not provided', () => {
    render(
      <TwoFactorOptionItem
        type="email"
        title="Email"
        onClick={mockOnClick}
      />
    );
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    render(
      <TwoFactorOptionItem
        type="sms"
        title="SMS"
        onClick={mockOnClick}
      />
    );
    const container = screen.getByText('SMS').closest('div').parentElement;
    fireEvent.click(container);
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('renders SMS icon for sms type', () => {
    const { container } = render(
      <TwoFactorOptionItem
        type="sms"
        title="SMS"
        onClick={mockOnClick}
      />
    );
    // Check that an icon is rendered
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('renders Email icon for email type', () => {
    const { container } = render(
      <TwoFactorOptionItem
        type="email"
        title="Email"
        onClick={mockOnClick}
      />
    );
    // Check that an icon is rendered
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('uses sms as default type', () => {
    const { container } = render(
      <TwoFactorOptionItem
        title="Default"
        onClick={mockOnClick}
      />
    );
    // Should render with SMS icon by default
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('applies hover styles', () => {
    const { container } = render(
      <TwoFactorOptionItem
        type="sms"
        title="SMS"
        onClick={mockOnClick}
      />
    );
    const box = container.firstChild;
    expect(box).toHaveStyle({ cursor: 'pointer' });
  });

  it('calls onClick when Enter key is pressed', () => {
    render(
      <TwoFactorOptionItem
        type="sms"
        title="SMS"
        onClick={mockOnClick}
      />
    );
    const container = screen.getByText('SMS').closest('div').parentElement;
    fireEvent.keyDown(container, { key: 'Enter' });
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick when Space key is pressed', () => {
    render(
      <TwoFactorOptionItem
        type="sms"
        title="SMS"
        onClick={mockOnClick}
      />
    );
    const container = screen.getByText('SMS').closest('div').parentElement;
    fireEvent.keyDown(container, { key: ' ' });
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick for other keys', () => {
    render(
      <TwoFactorOptionItem
        type="sms"
        title="SMS"
        onClick={mockOnClick}
      />
    );
    const container = screen.getByText('SMS').closest('div').parentElement;
    fireEvent.keyDown(container, { key: 'a' });
    fireEvent.keyDown(container, { key: 'Escape' });
    expect(mockOnClick).not.toHaveBeenCalled();
  });

  it('does not throw error when onClick is undefined and key is pressed', () => {
    render(
      <TwoFactorOptionItem
        type="sms"
        title="SMS"
      />
    );
    const container = screen.getByText('SMS').closest('div').parentElement;
    expect(() => {
      fireEvent.keyDown(container, { key: 'Enter' });
    }).not.toThrow();
  });

  it('has role="button" for accessibility', () => {
    render(
      <TwoFactorOptionItem
        type="sms"
        title="SMS"
        onClick={mockOnClick}
      />
    );
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('has tabIndex for keyboard navigation', () => {
    render(
      <TwoFactorOptionItem
        type="sms"
        title="SMS"
        onClick={mockOnClick}
      />
    );
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('tabIndex', '0');
  });
});
