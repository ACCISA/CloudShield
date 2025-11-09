import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AuthPage from '../AuthPage';

describe('AuthPage', () => {
  const mockOnLoginSuccess = jest.fn();

  beforeEach(() => {
    mockOnLoginSuccess.mockClear();
    // Mock console.log to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  it('renders login form', () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Password')).toBeInTheDocument();
  });

  it('renders login button', () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('displays default email value', () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    expect(screen.getByDisplayValue('johndoe@example.com')).toBeInTheDocument();
  });

  it('displays default password value', () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    expect(screen.getByDisplayValue('******')).toBeInTheDocument();
  });

  it('updates email when typing', () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    const emailInput = screen.getByDisplayValue('johndoe@example.com');
    fireEvent.change(emailInput, { target: { value: 'newemail@test.com' } });
    expect(emailInput).toHaveValue('newemail@test.com');
  });

  it('updates password when typing', () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    const passwordInput = screen.getByDisplayValue('******');
    fireEvent.change(passwordInput, { target: { value: 'newpassword' } });
    expect(passwordInput).toHaveValue('newpassword');
  });

  it('calls onLoginSuccess when login button is clicked', () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    const loginButton = screen.getByRole('button', { name: /login/i });
    fireEvent.click(loginButton);
    expect(mockOnLoginSuccess).toHaveBeenCalledTimes(1);
  });

  it('logs credentials when login button is clicked', () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    const loginButton = screen.getByRole('button', { name: /login/i });
    fireEvent.click(loginButton);
    expect(console.log).toHaveBeenCalledWith('login with', 'johndoe@example.com', '******');
  });

  it('renders AuthCard component', () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    expect(screen.getByText('LOGO')).toBeInTheDocument();
  });

  it('renders footer text from AuthCard', () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    // Use the typographic apostrophe (U+2019) that's actually in the component
    expect(screen.getByText("Can’t log in?")).toBeInTheDocument();
    expect(screen.getByText('Secure Login with 2FA')).toBeInTheDocument();
  });

  it('applies correct page layout styles', () => {
    const { container } = render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    const mainBox = container.firstChild;
    expect(mainBox).toHaveStyle({ 
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    });
  });

  it('works without onLoginSuccess callback', () => {
    render(<AuthPage />);
    const loginButton = screen.getByRole('button', { name: /login/i });
    expect(() => fireEvent.click(loginButton)).not.toThrow();
  });
});
