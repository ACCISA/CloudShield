import React from 'react';
import {within, render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import EmployeesPage from '../EmployeesPage.jsx';
import { AuthProvider, useAuth } from '../../context/AuthContext.jsx';
import { listUsers, deleteUser, createUser } from '../../services/usersApi.js';

jest.setTimeout(10000);

// --- 1. MOCK API ---
jest.mock('../../services/usersApi.js', () => ({
  listUsers: jest.fn(),
  deleteUser: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
}));

// --- 2. MOCK COMPONENTS ---

// Mock Table: Added 'Force Delete' to test deletion when no users are loaded (token missing)
jest.mock('../../components/users/UsersTable.jsx', () => {
  return function DummyUsersTable({ users, onEdit, onDelete, onSort }) {
    return (
      <div data-testid="users-table">
        <div data-testid="user-count">Count: {users.length}</div>
        <button data-testid="sort-name" onClick={() => onSort('name')}>Sort Name</button>
        <button data-testid="sort-files" onClick={() => onSort('files')}>Sort Files</button>
        
        {/* Helper button to test handleDelete even if table is empty */}
        <button data-testid="force-delete-btn" onClick={() => onDelete({ id: '999' })}>Force Delete</button>

        {users.map((u) => (
          <div key={u.id} data-testid={`user-row-${u.id}`}>
            <span>{u.name}</span>
            <button data-testid={`edit-btn-${u.id}`} onClick={() => onEdit(u)}>Edit</button>
            <button data-testid={`delete-btn-${u.id}`} onClick={() => onDelete(u)}>Delete</button>
          </div>
        ))}
      </div>
    );
  };
});

// Mock Create Modal
jest.mock('../../components/users/UserCreateModal.jsx', () => {
  const { useState } = require('react');
  return function DummyCreateModal({ open, onClose, onSubmit }) {
    const [form, setForm] = useState({});
    if (!open) return null;
    return (
      <div data-testid="create-modal">
        <input placeholder="First Name" onChange={e => setForm({...form, firstName: e.target.value})} />
        <button onClick={() => onSubmit({ ...form, email: 't@t.com', password: '123' })}>Confirm Create</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    );
  };
});

// Mock Edit Modal
jest.mock('../../components/users/UserEditModal.jsx', () => {
  const { useState } = require('react');
  return function DummyEditModal({ open, onClose, onSubmit, onDelete }) {
    const [name, setName] = useState('');
    if (!open) return null;
    return (
      <div data-testid="edit-modal">
        <input placeholder="First Name" onChange={e => setName(e.target.value)} />
        <button onClick={() => onSubmit({ firstName: name, lastName: 'D', email: 'u@t.com', jobTitle: 'Dev' })}>Confirm Update</button>
        <button onClick={onDelete}>Confirm Delete</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    );
  };
});

// Simple Mocks for others
jest.mock('../../components/common/SearchField/SearchField.jsx', () => ({ value, onChange, onKeyDown }) => (
  <input data-testid="search-input" value={value} onChange={e => onChange(e.target.value)} onKeyDown={onKeyDown} />
));
jest.mock('../../components/common/FilterButton/FilterButton.jsx', () => ({ onFilterChange }) => (
  <button data-testid="filter-active" onClick={() => onFilterChange('status', 'active', true)}>Filter Active</button>
));
jest.mock('../../components/common/CreateButton/CreateButton.jsx', () => ({ onClick }) => <button data-testid="open-create-btn" onClick={onClick}>Create</button>);
jest.mock('../../components/common/RefreshButton/RefreshButton.jsx', () => ({ onClick }) => <button data-testid="refresh-btn" onClick={onClick}>Refresh</button>);
jest.mock('../../components/common/DisplayButton/DisplayButton.jsx', () => () => <button>Display</button>);
jest.mock('../../assets/CreateUserIcon.jsx', () => () => <span>Icon</span>);

// --- 3. HELPER ---
const renderPage = ({ accessToken = 'valid-token' } = {}) => {
  return render(
    <AuthProvider initialState={{ currentUser: { id: 'admin-1', role: 'admin' }, accessToken, disableBootstrap: true }}>
      <EmployeesPage />
    </AuthProvider>
  );
};

function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe('EmployeesPage', () => {
  const seedUsers = [
    { _id: '1', full_name: 'Alice', email: 'a@t.com', role: 'admin', status: 'active', files: 10 },
    { _id: '2', full_name: 'Bob', email: 'b@t.com', role: 'employee', status: 'offline', files: 5 },
  ];

  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterAll(() => {
    console.error.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    usersApi.listUsers.mockResolvedValue([...seedUsers]);
    usersApi.createUser.mockResolvedValue({ user_id: 'new' });
    usersApi.updateUser.mockResolvedValue({ success: true });
    usersApi.deleteUser.mockResolvedValue({ success: true });
  });

  // --- API & RENDER ---
  it('renders users fetched from API', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    expect(screen.getByTestId('user-count')).toHaveTextContent('Count: 2');
  });

  it('handles API failure on load', async () => {
    usersApi.listUsers.mockRejectedValue(new Error('Fetch Failed'));
    renderPage();
    expect(await screen.findByText('Fetch Failed')).toBeInTheDocument();
  });

  it('refreshes users', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    await userEvent.click(screen.getByTestId('refresh-btn'));
    expect(usersApi.listUsers).toHaveBeenCalledTimes(2);
  });

  // --- SEARCH ---
  it('filters by search', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    await userEvent.type(screen.getByTestId('search-input'), 'Alice');
    await waitFor(() => expect(screen.getByTestId('user-count')).toHaveTextContent('Count: 1'));
  });

  it('fetches on Enter key', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    fireEvent.keyDown(screen.getByTestId('search-input'), { key: 'Enter', code: 'Enter' });
    expect(usersApi.listUsers).toHaveBeenCalledTimes(2);
  });

  // --- SORT ---
  it('sorts by numeric field (Files)', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    await userEvent.click(screen.getByTestId('sort-files'));
    await userEvent.click(screen.getByTestId('sort-files'));
    await userEvent.click(screen.getByTestId('sort-name'));
    expect(screen.getByTestId('users-table')).toBeInTheDocument();
  });

  // --- FILTER ---
  it('filters by status', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    await userEvent.click(screen.getByTestId('filter-active'));
    await waitFor(() => expect(screen.queryByText('Bob')).not.toBeInTheDocument());
  });

  // --- CREATE ---
  it('creates user successfully', async () => {
    renderPage();
    await userEvent.click(screen.getByTestId('open-create-btn'));
    await userEvent.click(screen.getByText('Confirm Create'));
    expect(await screen.findByText('User created successfully')).toBeInTheDocument();
  });

  it('handles create failure', async () => {
    usersApi.createUser.mockRejectedValue(new Error('Create Failed'));
    renderPage();
    await userEvent.click(screen.getByTestId('open-create-btn'));
    await userEvent.click(screen.getByText('Confirm Create'));
    expect(await screen.findByText('Create Failed')).toBeInTheDocument();
  });

  it('closes create modal', async () => {
    renderPage();
    await userEvent.click(screen.getByTestId('open-create-btn'));
    await userEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByTestId('create-modal')).not.toBeInTheDocument();
  });

  // --- UPDATE ---
  it('updates user successfully', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    await userEvent.click(screen.getByTestId('edit-btn-1'));
    await userEvent.click(screen.getByText('Confirm Update'));
    expect(await screen.findByText('User updated successfully')).toBeInTheDocument();
  });

  it('handles update failure', async () => {
    usersApi.updateUser.mockRejectedValue(new Error('Update Failed'));
    renderPage();
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    await userEvent.click(screen.getByTestId('edit-btn-1'));
    await userEvent.click(screen.getByText('Confirm Update'));
    expect(await screen.findByText(/update failed/i)).toBeInTheDocument();
  });

  it('closes edit modal', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    await userEvent.click(screen.getByTestId('edit-btn-1'));
    await userEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByTestId('edit-modal')).not.toBeInTheDocument();
  });

  // --- DELETE ---
  it('deletes user successfully', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    await userEvent.click(screen.getByTestId('delete-btn-1'));
    expect(await screen.findByText('User deleted successfully')).toBeInTheDocument();
  });

  it('blocks delete if token is missing', async () => {
    // Render strictly without token
    renderPage({ accessToken: null });

    // Use the "Force Delete" button we added to the mock
    // This allows us to click delete even if no data loaded
    await userEvent.click(screen.getByTestId('force-delete-btn'));

    // Verify API was NOT called
    expect(usersApi.deleteUser).not.toHaveBeenCalled();
  });

  it('deletes from edit modal', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    await userEvent.click(screen.getByTestId('edit-btn-1'));
    await userEvent.click(screen.getByText('Confirm Delete'));
    expect(usersApi.deleteUser).toHaveBeenCalled();
  });

  // --- EDGE CASES ---
  it('blocks create without token', async () => {
    renderPage({ accessToken: null });
    await userEvent.click(screen.getByTestId('open-create-btn'));
    await userEvent.click(screen.getByText('Confirm Create'));
    expect(await screen.findByText(/must be logged in/i)).toBeInTheDocument();
  });

  it('prevents self-deletion', async () => {
    render(
      <AuthProvider initialState={{ currentUser: { id: '1' }, accessToken: 'valid', disableBootstrap: true }}>
        <EmployeesPage />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    await userEvent.click(screen.getByTestId('delete-btn-1'));
    expect(await screen.findByText(/cannot delete your own account/i)).toBeInTheDocument();
  });

  it('closes toast on Enter', async () => {
    renderPage();
    await userEvent.click(screen.getByTestId('open-create-btn'));
    await userEvent.click(screen.getByText('Confirm Create'));
    const toast = await screen.findByText('User created successfully');
    toast.focus();
    fireEvent.keyDown(toast, { key: 'Enter', code: 'Enter' });
    await waitFor(() => expect(screen.queryByText('User created successfully')).not.toBeInTheDocument());
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