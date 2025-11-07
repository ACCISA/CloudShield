import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AuthTextField from '../AuthTextField';

describe('AuthTextField', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders with label', () => {
    render(
      <AuthTextField
        label="Username"
        placeholder="Enter username"
        value=""
        onChange={mockOnChange}
      />
    );
    expect(screen.getByText('Username')).toBeInTheDocument();
  });

  it('displays placeholder text', () => {
    render(
      <AuthTextField
        label="Email"
        placeholder="Enter your email"
        value=""
        onChange={mockOnChange}
      />
    );
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
  });

  it('displays the provided value', () => {
    render(
      <AuthTextField
        label="Username"
        placeholder=""
        value="john.doe"
        onChange={mockOnChange}
      />
    );
    expect(screen.getByDisplayValue('john.doe')).toBeInTheDocument();
  });

  it('calls onChange when input value changes', () => {
    render(
      <AuthTextField
        label="Username"
        placeholder=""
        value=""
        onChange={mockOnChange}
      />
    );
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'newuser' } });
    expect(mockOnChange).toHaveBeenCalled();
  });

  it('uses text type by default', () => {
    render(
      <AuthTextField
        label="Username"
        placeholder=""
        value=""
        onChange={mockOnChange}
      />
    );
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'text');
  });

  it('supports custom input type', () => {
    render(
      <AuthTextField
        label="Email"
        type="email"
        placeholder=""
        value=""
        onChange={mockOnChange}
      />
    );
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'email');
  });

  it('renders end adornment when provided', () => {
    render(
      <AuthTextField
        label="Search"
        placeholder=""
        value=""
        onChange={mockOnChange}
        endAdornment={<span data-testid="adornment">🔍</span>}
      />
    );
    expect(screen.getByTestId('adornment')).toBeInTheDocument();
  });
});
