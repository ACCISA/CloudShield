import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import EmployeesPage from '../EmployeesPage.jsx';
import { AuthProvider } from '../../context/AuthContext.jsx';
import { listUsers, deleteUser } from '../../services/usersApi.js';

jest.mock('../../services/usersApi.js', () => ({
  listUsers: jest.fn(),
  deleteUser: jest.fn(),
}));

const renderWithProviders = () => {
  const initialUser = {
    id: 'admin-001',
    email: 'admin@company.com',
    full_name: 'Admin User',
    role: 'admin',
  };

  return render(
    <AuthProvider initialState={{ currentUser: initialUser, accessToken: 'test-token', disableBootstrap: true }}>
      <EmployeesPage />
    </AuthProvider>
  );
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

    const deleteButtons = screen.getAllByRole('button', { name: /delete user/i });
    await user.click(deleteButtons[0]);

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

    const deleteButtons = screen.getAllByRole('button', { name: /delete user/i });
    await user.click(deleteButtons[0]);

    await user.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(screen.getByText('Forbidden')).toBeInTheDocument();
    });

    expect(deleteUser).toHaveBeenCalledWith('user-001', expect.objectContaining({ token: 'test-token' }));
  });

  it('prevents deleting the currently logged-in user', async () => {
    renderWithProviders();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: /delete user/i });
    // second button corresponds to the admin user in seedUsers
    await user.click(deleteButtons[1]);

    await user.click(screen.getByRole('button', { name: /confirm/i }));

    expect(deleteUser).not.toHaveBeenCalled();
    expect(screen.getByText(/cannot delete your own account/i)).toBeInTheDocument();
  });
});
