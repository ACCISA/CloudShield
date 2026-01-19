import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import EmployeesPage from '../EmployeesPage.jsx';
import { AuthProvider, useAuth } from '../../context/AuthContext.jsx';
import { listUsers, deleteUser, createUser } from '../../services/usersApi.js';

jest.setTimeout(10000);

jest.mock('../../services/usersApi.js', () => ({
  listUsers: jest.fn(),
  deleteUser: jest.fn(),
  createUser: jest.fn(),
}));

const AuthSpy = ({ onAuth }) => {
  onAuth(useAuth());
  return null;
};

// Utility to create a deferred promise
function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

async function openDeleteDialog(user, label) {
  await user.click(screen.getByRole('button', { name: new RegExp(`delete user ${label}`, 'i') }));
  await waitFor(() => {
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
}

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
    createUser.mockResolvedValue({ user_id: 'user-999' });
  });

  it('loads and renders users from the API', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    expect(listUsers).toHaveBeenCalledWith(expect.objectContaining({ token: 'test-token', search: '', limit: 20, offset: 0 }));
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

  it('creates a user and updates the table immediately', async () => {
    renderWithProviders();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /add employee/i }));

    await user.type(screen.getByLabelText(/full name/i), 'New User');
    await user.type(screen.getByLabelText(/email/i), 'new@example.com');
    await user.type(screen.getByLabelText(/initial password/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(createUser).toHaveBeenCalledWith(expect.objectContaining({
        email: 'new@example.com',
        full_name: 'New User',
        password: 'Password123!',
        role: 'employee',
      }), expect.objectContaining({ token: 'test-token' }));
    });

    expect(await screen.findByText('New User')).toBeInTheDocument();
    expect(screen.getByText(/was created successfully/i)).toBeInTheDocument();
  });

  it('requires non-empty trimmed name, email, and password before create', async () => {
    renderWithProviders();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /add employee/i }));

    await user.type(screen.getByLabelText(/full name/i), '   ');
    await user.type(screen.getByLabelText(/email/i), '   ');
    await user.type(screen.getByLabelText(/initial password/i), '   ');
    await user.click(screen.getByRole('button', { name: /create/i }));

    expect(createUser).not.toHaveBeenCalled();
    expect(await screen.findByText(/full name, email, and password are required/i)).toBeInTheDocument();
  });

  it('shows generic create error when API fails unexpectedly', async () => {
    const err = new Error('Server down');
    createUser.mockRejectedValueOnce(err);

    renderWithProviders();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /add employee/i }));
    await user.type(screen.getByLabelText(/full name/i), 'Err User');
    await user.type(screen.getByLabelText(/email/i), 'err@example.com');
    await user.type(screen.getByLabelText(/initial password/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /create/i }));

    expect(await screen.findByText(/server down/i)).toBeInTheDocument();
    expect(createUser).toHaveBeenCalled();
  });

  it('blocks create when no access token is present', async () => {
    renderWithProviders({ initialState: { accessToken: null } });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /add employee/i }));
    await user.type(screen.getByLabelText(/full name/i), 'Tokenless User');
    await user.type(screen.getByLabelText(/email/i), 'noauth@example.com');
    await user.type(screen.getByLabelText(/initial password/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /create/i }));

    expect(createUser).not.toHaveBeenCalled();
    expect(await screen.findByText(/missing authentication token/i)).toBeInTheDocument();
  });

  it('applies search term and refetches with query params', async () => {
    renderWithProviders();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText(/search employees/i), 'neo');
    await user.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => {
      const lastCall = listUsers.mock.calls[listUsers.mock.calls.length - 1][0];
      expect(lastCall.search).toBe('neo');
    });
  });

  it('shows duplicate email error on 409', async () => {
    const err = new Error('Conflict');
    err.status = 409;
    err.payload = { error: 'Email already exists' };
    createUser.mockRejectedValueOnce(err);

    renderWithProviders();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /add employee/i }));
    await user.type(screen.getByLabelText(/full name/i), 'Dup User');
    await user.type(screen.getByLabelText(/email/i), 'dup@example.com');
    await user.type(screen.getByLabelText(/initial password/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /create/i }));

    expect(await screen.findByText(/email already exists/i)).toBeInTheDocument();
    expect(createUser).toHaveBeenCalled();
  });

  it('shows limit exceeded error on 403', async () => {
    const err = new Error('Forbidden');
    err.status = 403;
    err.payload = { error: 'User limit reached' };
    createUser.mockRejectedValueOnce(err);

    renderWithProviders();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /add employee/i }));
    await user.type(screen.getByLabelText(/full name/i), 'Limit User');
    await user.type(screen.getByLabelText(/email/i), 'limit@example.com');
    await user.type(screen.getByLabelText(/initial password/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /create/i }));

    expect(await screen.findByText(/user limit reached/i)).toBeInTheDocument();
    expect(createUser).toHaveBeenCalled();
  });


  it('cancels deletion: closes dialog and does not call API', async () => {
    renderWithProviders();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /delete user jane smith/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('shows correct user identity in confirmation dialog (name/email)', async () => {
  listUsers.mockResolvedValueOnce([
    { _id: 'user-101', full_name: 'Jane Smith', email: 'jane@example.com', role: 'employee', status: 'active' },
    { _id: 'user-102', full_name: '', email: 'noname@example.com', role: 'employee', status: 'active' },
  ]);

    renderWithProviders();
    const user = userEvent.setup();

    // Wait for both users to load
    expect(await screen.findByText('Jane Smith')).toBeInTheDocument();

    // --- Case 1: dialog shows full name when available ---
    await user.click(screen.getByRole('button', { name: /delete user jane smith/i }));

    const dialog1 = await screen.findByRole('dialog');
    expect(within(dialog1).getByText(/are you sure you want to delete/i)).toBeInTheDocument();
    expect(within(dialog1).getByText('Jane Smith')).toBeInTheDocument();

    await user.click(within(dialog1).getByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // --- Case 2: dialog falls back to email when name is missing ---
    // Find the row for the user with no name
    const emailCell = screen.getByText('noname@example.com');
    const row = emailCell.closest('tr');
    expect(row).not.toBeNull();

    await user.click(within(row).getByRole('button', { name: /delete user/i }));

    const dialog2 = await screen.findByRole('dialog');
    expect(within(dialog2).getByText(/are you sure you want to delete/i)).toBeInTheDocument();
    expect(within(dialog2).getByText('noname@example.com')).toBeInTheDocument();
  });

  it('shows correct user name in confirmation dialog', async () => {
  renderWithProviders();
  const user = userEvent.setup();

  await waitFor(() => {
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  await user.click(screen.getByRole('button', { name: /delete user jane smith/i }));

  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
  expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

});