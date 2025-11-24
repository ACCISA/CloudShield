import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import EmployeesPage from '../EmployeesPage.jsx';
import { AuthProvider, useAuth } from '../../context/AuthContext.jsx';
import { listUsers, deleteUser } from '../../services/usersApi.js';

jest.mock('../../services/usersApi.js', () => ({
  listUsers: jest.fn(),
  deleteUser: jest.fn(),
}));

const AuthSpy = ({ onAuth }) => {
  onAuth(useAuth());
  return null;
};

const renderWithProviders = ({ initialState = {}, captureAuth = false } = {}) => {
  const initialUser = {
    id: 'admin-001',
    email: 'admin@company.com',
    full_name: 'Admin User',
    role: 'admin',
  };

  const captured = { current: null };

  const Wrapper = ({ children }) => (
    <AuthProvider
      initialState={{
        currentUser: initialUser,
        accessToken: 'test-token',
        disableBootstrap: true,
        ...initialState,
      }}
    >
      {captureAuth ? <AuthSpy onAuth={(auth) => { captured.current = auth; }} /> : null}
      {children}
    </AuthProvider>
  );

  const utils = render(
    <Wrapper>
      <EmployeesPage />
    </Wrapper>
  );

  return { ...utils, getAuth: () => captured.current };
};

describe('EmployeesPage', () => {
  const seedUsers = [
    {
      _id: 'user-001',
      full_name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'employee',
      status: 'active',
    },
    {
      _id: 'admin-001',
      full_name: 'Admin User',
      email: 'admin@company.com',
      role: 'admin',
      status: 'active',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    listUsers.mockResolvedValue([...seedUsers]);
  });

  it('loads and renders users from the API', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    expect(listUsers).toHaveBeenCalledWith(expect.objectContaining({ token: 'test-token' }));
    expect(screen.getByText('admin@company.com')).toBeInTheDocument();
  });

  it('opens confirmation dialog and deletes user', async () => {
    deleteUser.mockResolvedValue({ message: 'User deleted' });

    renderWithProviders();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    const deleteJaneButton = screen.getByRole('button', { name: /delete user jane smith/i });
    await user.click(deleteJaneButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(deleteUser).toHaveBeenCalledWith('user-001', expect.objectContaining({ token: 'test-token' }));
    });

    await waitFor(() => {
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });

    expect(screen.getByText(/was deleted successfully/i)).toBeInTheDocument();
  });

  it('surfaces API errors when deletion fails', async () => {
    const err = new Error('Forbidden');
    err.payload = { error: 'Forbidden' };
    err.status = 403;
    deleteUser.mockRejectedValue(err);

    renderWithProviders();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    const deleteJaneButton = screen.getByRole('button', { name: /delete user jane smith/i });
    await user.click(deleteJaneButton);

    await user.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(screen.getAllByText('Forbidden').length).toBeGreaterThan(0);
    });

    expect(deleteUser).toHaveBeenCalledWith('user-001', expect.objectContaining({ token: 'test-token' }));
  });

  it('prevents deleting the currently logged-in user', async () => {
    renderWithProviders();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    const deleteAdminButton = screen.getByRole('button', { name: /delete user admin user/i });
    await user.click(deleteAdminButton);

    await user.click(screen.getByRole('button', { name: /confirm/i }));

    expect(deleteUser).not.toHaveBeenCalled();
    expect(screen.getByText(/cannot delete your own account/i)).toBeInTheDocument();
  });

  it('shows empty state when no users are returned', async () => {
    listUsers.mockResolvedValueOnce([]);

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('No users found.')).toBeInTheDocument();
    });
  });

  it('surfaces load failures via banner', async () => {
    listUsers.mockRejectedValueOnce(new Error('Backend unavailable'));

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Backend unavailable');
    });
  });

  it('ignores abort errors when fetching users', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    listUsers.mockRejectedValueOnce(abortError);

    renderWithProviders();

    await waitFor(() => {
      expect(listUsers).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('No users found.')).toBeInTheDocument();
  });

  it('shows warning banner when user is not authenticated', async () => {
    listUsers.mockResolvedValueOnce(seedUsers);

    renderWithProviders({ initialState: { accessToken: null } });

    await waitFor(() => {
      expect(screen.getByText('Sign in to view employees.')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await userEvent.click(refreshButton);

    await waitFor(() => {
      expect(screen.getByText('Authentication required to refresh users.')).toBeInTheDocument();
    });
    expect(listUsers).not.toHaveBeenCalled();
  });

  it('shows auth error banner when provided by context', async () => {
    renderWithProviders({ initialState: { accessToken: null, authError: 'Auth boom' } });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Auth boom');
    });
  });

  it('sets loading while auth state refreshes', () => {
    const authModule = require('../../context/AuthContext.jsx');
    const useAuthSpy = jest.spyOn(authModule, 'useAuth');
    useAuthSpy.mockReturnValue({
      currentUser: { id: 'admin-001' },
      accessToken: 'test-token',
      authError: null,
      authLoading: true,
      refreshAuth: jest.fn(),
    });

    render(<EmployeesPage />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    useAuthSpy.mockRestore();
  });

  it('prevents deletion when authentication token disappears mid-flow', async () => {
    const { getAuth } = renderWithProviders({ captureAuth: true });
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(getAuth()).not.toBeNull();
    });

    const deleteJaneButton = screen.getByRole('button', { name: /delete user jane smith/i });
    await user.click(deleteJaneButton);

    await act(async () => {
      getAuth().refreshAuth();
    });

    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);

    expect(deleteUser).not.toHaveBeenCalled();
    expect(screen.getByText(/missing authentication token/i)).toBeInTheDocument();
  });
});
