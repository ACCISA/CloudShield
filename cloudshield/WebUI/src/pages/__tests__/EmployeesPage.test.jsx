import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import EmployeesPage from '../EmployeesPage.jsx';
import { AuthProvider, useAuth } from '../../context/AuthContext.jsx';
import { listUsers, deleteUser, createUser } from '../../services/usersApi.js';
import { within, fireEvent } from '@testing-library/react';

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

function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

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

    // Wait until the list renders
    expect(await screen.findByText('Jane Smith')).toBeInTheDocument();

    // --- Case 1: dialog shows full name ---
    await user.click(screen.getByRole('button', { name: /delete user jane smith/i }));

    const dialog1 = await screen.findByRole('dialog');
    expect(within(dialog1).getByText(/are you sure you want to delete/i)).toBeInTheDocument();
    // scoped to dialog so it doesn't accidentally match the table cell
    expect(within(dialog1).getByText('Jane Smith')).toBeInTheDocument();

    await user.click(within(dialog1).getByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // --- Case 2: dialog shows email fallback when name is blank ---
    // Find the table cell with the email, then grab its row and click the delete button inside it
    const emailCell = screen.getByText('noname@example.com');
    const row = emailCell.closest('tr');
    expect(row).not.toBeNull();

    await user.click(within(row).getByRole('button', { name: /delete user/i }));

    const dialog2 = await screen.findByRole('dialog');
    expect(within(dialog2).getByText(/are you sure you want to delete/i)).toBeInTheDocument();
    expect(within(dialog2).getByText('noname@example.com')).toBeInTheDocument();
  });

 //--------------------------------------------------------------------------

  it('disables controls and shows spinner while deletion is in-flight', async () => {
    const d = deferred();
    deleteUser.mockImplementation(() => d.promise);

    renderWithProviders();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    // Open dialog
    const deleteJaneButton = screen.getByRole('button', { name: /delete user jane smith/i });
    await user.click(deleteJaneButton);

    // Confirm deletion (starts async)
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);

    // WAIT for "deleting" state to appear (state update is async)
    await waitFor(() => {
      // Confirm button becomes "Deleting…" and disabled :contentReference[oaicite:2]{index=2}
      expect(screen.getByRole('button', { name: /deleting/i })).toBeDisabled();

      // Cancel disabled during deletion :contentReference[oaicite:3]{index=3}
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();

      // Row delete button disabled during deletion :contentReference[oaicite:4]{index=4}
      expect(deleteJaneButton).toBeDisabled();
    });

    // Spinner specifically inside Jane’s delete button :contentReference[oaicite:5]{index=5}
    // (CircularProgress should expose role="progressbar")
    expect(
    within(deleteJaneButton).getByRole('progressbar', { hidden: true })).toBeInTheDocument();


    // Finish request
    d.resolve({ message: 'User deleted' });

    // Final UI update (existing test behavior)
    await waitFor(() => {
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
    expect(screen.getByText(/was deleted successfully/i)).toBeInTheDocument();
  });
  
  it("shows error when deletion fails (user not found / 404) and keeps the row", async () => {
    const err = new Error("Not found");
    err.status = 404;
    err.payload = { error: "Not found" };
    deleteUser.mockRejectedValueOnce(err);

    renderWithProviders();
    const user = userEvent.setup();

    const userName = "Jane Smith";

    // Wait until table renders
    const nameCell = await screen.findByText(userName);
    expect(nameCell).toBeInTheDocument();

    // Click delete for Jane
    await user.click(screen.getByRole("button", { name: /delete user jane smith/i }));
    await user.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() => expect(deleteUser).toHaveBeenCalledTimes(1));

    // Error appears (could be duplicated in banner + dialog)
    const msgs = await screen.findAllByText(/not found/i);
    expect(msgs.length).toBeGreaterThan(0);

    // Assert Jane is still in the TABLE (scope to row)
    const row = nameCell.closest("tr");
    expect(row).not.toBeNull();
    expect(within(row).getByText(userName)).toBeInTheDocument();
  });

  it('sorts users by full_name, falling back to email then empty string', async () => {
    listUsers.mockResolvedValueOnce([
      { _id: 'u3', full_name: null, email: null, role: 'employee', status: 'active' },
      { _id: 'u2', full_name: '', email: 'bob@example.com', role: 'employee', status: 'active' },
      { _id: 'u1', full_name: 'Alice', email: 'alice@example.com', role: 'employee', status: 'active' },
    ]);

    renderWithProviders();

    await screen.findByText('Alice');

    const rows = screen.getAllByRole('row').slice(1);

    // First row: null name/email
    expect(within(rows[0]).getAllByText('—')).toHaveLength(2);
    // Second row: Alice
    expect(within(rows[1]).getByText('Alice')).toBeInTheDocument();
    // Third row:
    expect(within(rows[2]).getByText('bob@example.com')).toBeInTheDocument();
  });

  it('does not fetch users when accessToken becomes null (fetchUsers early return)', async () => {
    const { rerender } = renderWithProviders();

    await screen.findByText('Jane Smith');
    expect(listUsers).toHaveBeenCalled();

    // Rerender with null accessToken
    rerender(
      <AuthProvider initialState={{ currentUser: { id: 'admin-001' }, accessToken: null, disableBootstrap: true }}>
        <EmployeesPage />
      </AuthProvider>
    );

    // Try to refresh
    await userEvent.click(screen.getByRole('button', { name: /refresh/i }));

    expect(listUsers).toHaveBeenCalledTimes(1);
    });

    it('shows default load error message when error.message is missing', async () => {
    listUsers.mockRejectedValueOnce({}); // no message

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to load users.');
    });
  });

  it('blocks create when no access token is present (submit path)', async () => {
    renderWithProviders({ initialState: { accessToken: null } });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /add employee/i }));

    await user.type(screen.getByLabelText(/full name/i), 'Tokenless User');
    await user.type(screen.getByLabelText(/email/i), 'noauth@example.com');
    await user.type(screen.getByLabelText(/initial password/i), 'Password123!');

    // Submit the form directly
    await user.click(screen.getByRole('button', { name: /^create$/i }));

    expect(createUser).not.toHaveBeenCalled();
    expect(await screen.findByText(/missing authentication token/i)).toBeInTheDocument();
  });

  it('applies search when pressing Enter in search input', async () => {
    renderWithProviders();
    const user = userEvent.setup();

    await screen.findByText('Jane Smith');

    const input = screen.getByPlaceholderText(/search employees/i);
    await user.type(input, 'neo{enter}');

    await waitFor(() => {
      const lastCall = listUsers.mock.calls[listUsers.mock.calls.length - 1][0];
      expect(lastCall.search).toBe('neo');
    });
  });

  it("does not close the create dialog while isCreating is true", async () => {
    const d = deferred();
    createUser.mockImplementation(() => d.promise);

    renderWithProviders();
    const user = userEvent.setup();

    await screen.findByText("Jane Smith");

    await user.click(screen.getByRole("button", { name: /add employee/i }));

    await user.type(screen.getByLabelText(/full name/i), "Pending User");
    await user.type(screen.getByLabelText(/email/i), "pending@example.com");
    await user.type(screen.getByLabelText(/initial password/i), "Password123!");

    // Submit the form
    const createBtn = screen.getByRole("button", { name: /^create$/i });
    await user.click(createBtn);
    // At this point, isCreating should be true

    // Buttons should be disabled while creating
    const creatingBtn = await screen.findByRole("button", { name: /creating/i });
    const cancelBtn = screen.getByRole("button", { name: /cancel/i });

    expect(creatingBtn).toBeDisabled();
    expect(cancelBtn).toBeDisabled();

    // Dialog should STILL be open while creation is pending
    expect(screen.getByRole("dialog", { name: /add employee/i })).toBeInTheDocument();

    d.resolve({ user_id: "user-123" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /add employee/i })).not.toBeInTheDocument();
    });
  });

  it('renders the Employees table when users exist', async () => {
    renderWithProviders();
    await screen.findByText('Jane Smith');

    // UserTable renders a MUI Table with aria-label "Employees table"
    expect(screen.getByLabelText('Employees table')).toBeInTheDocument();
  });

  it('falls back to default role and status when missing', async () => {
    listUsers.mockResolvedValueOnce([
      { _id: 'u1', full_name: 'No Meta', email: 'nometa@example.com', role: null, status: null },
    ]);

    renderWithProviders();

    await screen.findByText('No Meta');

    // Role cell fallback
    expect(screen.getByText('employee')).toBeInTheDocument();
    // Status cell fallback
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('handleRefresh returns early when accessToken is missing', async () => {
    renderWithProviders({ initialState: { accessToken: null } });

    // Wait until the warning banner appears from useEffect
    await screen.findByText('Sign in to view employees.');

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await userEvent.click(refreshButton);

    expect(screen.getByText('Authentication required to refresh users.')).toBeInTheDocument();
    expect(listUsers).not.toHaveBeenCalled(); 
  });

  it('refresh button triggers fetchUsers when authenticated', async () => {
    renderWithProviders();

    await screen.findByText('Jane Smith');
    expect(listUsers).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('button', { name: /refresh/i }));

    await waitFor(() => expect(listUsers).toHaveBeenCalledTimes(2));
  });

  it('uses currentUser._id when currentUser.id is missing (self delete button disabled)', async () => {
    renderWithProviders({
      initialState: {
        currentUser: { _id: 'admin-001', email: 'admin@company.com', full_name: 'Admin User', role: 'admin' },
        accessToken: 'test-token',
      },
    });

    await screen.findByText('Admin User');

    const deleteAdminButton = screen.getByRole('button', { name: /delete user admin user/i });

    // This proves currentUserId resolved to _id and matched the row -> button disabled
    expect(deleteAdminButton).toBeDisabled();
  });

  it('does not close create dialog via Dialog onClose while isCreating is true', async () => {
    const d = deferred();
    createUser.mockImplementation(() => d.promise);

    renderWithProviders();
    const user = userEvent.setup();

    await screen.findByText('Jane Smith');
    await user.click(screen.getByRole('button', { name: /add employee/i }));

    await user.type(screen.getByLabelText(/full name/i), 'Pending User');
    await user.type(screen.getByLabelText(/email/i), 'pending@example.com');
    await user.type(screen.getByLabelText(/initial password/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /^create$/i }));

    // While isCreating true, try to close dialog using Escape (triggers Dialog onClose)
    await user.keyboard('{Escape}');

    // Dialog should still be open because handleCloseCreate returns early
    expect(screen.getByRole('dialog', { name: /add employee/i })).toBeInTheDocument();

    d.resolve({ user_id: 'user-123' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /add employee/i })).not.toBeInTheDocument();
    });
  });

});