import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PasswordField from '../PasswordField';

describe('PasswordField', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders with default label', () => {
    render(<PasswordField value="" onChange={mockOnChange} />);
    expect(screen.getByText('Password')).toBeInTheDocument();
  });

  it('renders with custom label', () => {
    render(<PasswordField label="New Password" value="" onChange={mockOnChange} />);
    expect(screen.getByText('New Password')).toBeInTheDocument();
  });

  it('displays password as hidden by default', () => {
    render(<PasswordField value="secret123" onChange={mockOnChange} />);
    const input = screen.getByDisplayValue('secret123');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('shows "Show" text when password is hidden', () => {
    render(<PasswordField value="" onChange={mockOnChange} />);
    expect(screen.getByText('Show')).toBeInTheDocument();
  });

  it('toggles password visibility when Show/Hide is clicked', () => {
    render(<PasswordField value="secret123" onChange={mockOnChange} />);
    const input = screen.getByDisplayValue('secret123');
    const showButton = screen.getByText('Show');
    
    // Initially hidden
    expect(input).toHaveAttribute('type', 'password');
    
    // Click to show
    fireEvent.click(showButton);
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByText('Hide')).toBeInTheDocument();
    
    // Click to hide again
    const hideButton = screen.getByText('Hide');
    fireEvent.click(hideButton);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('toggles password visibility when icon button is clicked', () => {
    render(<PasswordField value="secret123" onChange={mockOnChange} />);
    const input = screen.getByDisplayValue('secret123');
    const iconButtons = screen.getAllByRole('button');
    const visibilityButton = iconButtons[0];
    
    // Initially hidden
    expect(input).toHaveAttribute('type', 'password');
    
    // Click icon to show
    fireEvent.click(visibilityButton);
    expect(input).toHaveAttribute('type', 'text');
  });

  it('calls onChange when input value changes', () => {
    render(<PasswordField value="" onChange={mockOnChange} />);
    const input = screen.getByDisplayValue('');
    
    fireEvent.change(input, { target: { value: 'newpassword' } });
    expect(mockOnChange).toHaveBeenCalled();
  });

  it('displays the provided value', () => {
    render(<PasswordField value="mypassword" onChange={mockOnChange} />);
    expect(screen.getByDisplayValue('mypassword')).toBeInTheDocument();
  });
});
