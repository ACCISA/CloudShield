import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import EmployeesPage from './EmployeesPage.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';
import * as usersApi from '../services/usersApi.js';

jest.setTimeout(10000);

jest.mock('../services/usersApi.js', () => ({
  listUsers: jest.fn(),
  deleteUser: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
}));

const renderWithProviders = (ui, { currentUser = { id: 'admin-1', role: 'admin', org_id: 'org-1' } } = {}) => {
  return render(
    <AuthProvider
      initialState={{
        currentUser,
        accessToken: 'test-token',
        disableBootstrap: true,
      }}
    >
      {ui}
    </AuthProvider>
  );
};

describe('EmployeesPage', () => {
  const seedUsers = [
    { _id: 'user-1', full_name: 'Jane Smith', email: 'jane@test.com', role: 'employee', status: 'active' },
    { _id: 'user-2', full_name: 'John Doe', email: 'john@test.com', role: 'admin', status: 'offline' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    usersApi.listUsers.mockResolvedValue([...seedUsers]);
    usersApi.createUser.mockResolvedValue({ user_id: 'new-1' });
    usersApi.updateUser.mockResolvedValue({ success: true });
    usersApi.deleteUser.mockResolvedValue({ success: true });
  });

  it('loads and displays users', async () => {
    renderWithProviders(<EmployeesPage />);

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    expect(usersApi.listUsers).toHaveBeenCalledWith(expect.objectContaining({ limit: 100 }));
  });

  it('creates a new user', async () => {
    renderWithProviders(<EmployeesPage />);
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByText('Jane Smith')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /create/i }));

    await user.type(screen.getByLabelText(/first name/i), 'Alice');
    await user.type(screen.getByLabelText(/last name/i), 'Wonder');
    await user.type(screen.getByLabelText(/email/i), 'alice@test.com');
    await user.type(screen.getByLabelText(/job title/i), 'Dev');
    await user.type(screen.getByLabelText(/password/i), 'Pass123!');

    const dialog = screen.getByRole('dialog');
    const submitBtn = within(dialog).getByRole('button', { name: /create/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(usersApi.createUser).toHaveBeenCalledWith(expect.objectContaining({
        email: 'alice@test.com',
        full_name: 'Alice Wonder',
        role: 'employee'
      }), expect.anything());
    });

    expect(await screen.findByText('User created successfully')).toBeInTheDocument();
  });

  it('edits an existing user', async () => {
    renderWithProviders(<EmployeesPage />);
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByText('Jane Smith')).toBeInTheDocument());

    const rows = screen.getAllByRole('row');
    const row = rows.find(r => within(r).queryByText('Jane Smith'));
    const editBtn = within(row).getAllByRole('button')[0];
    await user.click(editBtn);

    const firstNameInput = screen.getByLabelText(/first name/i);
    await user.clear(firstNameInput);
    await user.type(firstNameInput, 'Janet');

    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(usersApi.updateUser).toHaveBeenCalledWith('user-1', expect.objectContaining({ full_name: 'Janet Smith' }), expect.anything());
    });

    expect(await screen.findByText('User updated successfully')).toBeInTheDocument();
  });

  it('deletes a user', async () => {
    renderWithProviders(<EmployeesPage />);
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByText('Jane Smith')).toBeInTheDocument());

    const rows = screen.getAllByRole('row');
    const row = rows.find(r => within(r).queryByText('Jane Smith'));
    const editBtn = within(row).getAllByRole('button')[0];
    await user.click(editBtn);

    await user.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(usersApi.deleteUser).toHaveBeenCalledWith('user-1', expect.anything());
    });

    expect(await screen.findByText('User deleted successfully')).toBeInTheDocument();
  });

  it('shows error toast on API failure', async () => {
    usersApi.createUser.mockRejectedValue(new Error('Backend Error'));
    renderWithProviders(<EmployeesPage />);
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByText('Jane Smith')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /create/i }));
    
    // Fill minimal valid form
    await user.type(screen.getByLabelText(/first name/i), 'Test');
    await user.type(screen.getByLabelText(/last name/i), 'User');
    await user.type(screen.getByLabelText(/email/i), 't@t.com');
    await user.type(screen.getByLabelText(/password/i), '123');

    const dialog = screen.getByRole('dialog');
    const submitBtn = within(dialog).getByRole('button', { name: /create/i });
    await user.click(submitBtn);

    expect(await screen.findByText(/backend error/i)).toBeInTheDocument();
  });

  it('prevents self-deletion', async () => {
    renderWithProviders(<EmployeesPage />, { currentUser: { id: 'user-1' } });
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByText('Jane Smith')).toBeInTheDocument());

    const rows = screen.getAllByRole('row');
    const row = rows.find(r => within(r).queryByText('Jane Smith'));
    const editBtn = within(row).getAllByRole('button')[0];
    await user.click(editBtn);

    await user.click(screen.getByRole('button', { name: /delete/i }));

    expect(await screen.findByText(/cannot delete your own account/i)).toBeInTheDocument();
    expect(usersApi.deleteUser).not.toHaveBeenCalled();
  });
});