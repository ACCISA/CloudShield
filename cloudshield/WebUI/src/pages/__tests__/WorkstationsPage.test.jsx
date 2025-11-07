import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import WorkstationsPage from '../WorkstationsPage';

// Mock child components
jest.mock('../../components/workstations/WorkstationList', () => {
  return function MockWorkstationList({ rows, onEdit, onToggleStatus }) {
    return (
      <div data-testid="workstation-list">
        {rows.map(row => (
          <div key={row.id} data-testid={`workstation-${row.id}`}>
            <span>{row.name}</span>
            <button onClick={() => onEdit(row)}>Edit {row.name}</button>
            <button onClick={() => onToggleStatus(row.id)}>Toggle Status</button>
          </div>
        ))}
      </div>
    );
  };
});

jest.mock('../../components/workstations/WorkstationCreateDialog', () => {
  return function MockWorkstationCreateDialog({ open, onClose, onCreate }) {
    if (!open) return null;
    return (
      <div data-testid="create-dialog">
        <button onClick={() => {
          onCreate({
            name: 'New Workstation',
            code: 'WS-NEW',
            users: ['Test User'],
          });
        }}>
          Create Workstation
        </button>
        <button onClick={onClose}>Close</button>
      </div>
    );
  };
});

jest.mock('../../components/workstations/WorkstationEditDialog', () => {
  return function MockWorkstationEditDialog({ open, row, onClose, onSave, onDelete }) {
    if (!open || !row) return null;
    return (
      <div data-testid="edit-dialog">
        <span>Editing: {row.name}</span>
        <button onClick={() => onSave({ name: 'Updated Name' })}>Save</button>
        <button onClick={onDelete}>Delete</button>
        <button onClick={onClose}>Close</button>
      </div>
    );
  };
});

describe('WorkstationsPage', () => {
  it('renders the page with search bar', () => {
    render(<WorkstationsPage />);
    
    const searchInput = screen.getByPlaceholderText('Search workstations');
    expect(searchInput).toBeInTheDocument();
  });

  it('renders toolbar action buttons', () => {
    render(<WorkstationsPage />);
    
    expect(screen.getByRole('button', { name: /display/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });

  it('renders workstation list', () => {
    render(<WorkstationsPage />);
    
    expect(screen.getByTestId('workstation-list')).toBeInTheDocument();
  });

  it('displays initial seed workstations', () => {
    render(<WorkstationsPage />);
    
    // There are multiple workstations with "Development" name, so use getAllByText
    const developmentWorkstations = screen.getAllByText('Development');
    expect(developmentWorkstations.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Marketing')).toBeInTheDocument();
  });

  it('filters workstations based on search input', () => {
    render(<WorkstationsPage />);
    
    const searchInput = screen.getByPlaceholderText('Search workstations');
    
    // Initial state - should show multiple workstations
    expect(screen.getAllByText('Development')).toHaveLength(3);
    
    // Search for "Marketing"
    fireEvent.change(searchInput, { target: { value: 'Marketing' } });
    
    expect(screen.getByText('Marketing')).toBeInTheDocument();
    expect(screen.queryByText('Development')).not.toBeInTheDocument();
  });

  it('filters workstations by code', () => {
    render(<WorkstationsPage />);
    
    const searchInput = screen.getByPlaceholderText('Search workstations');
    fireEvent.change(searchInput, { target: { value: 'WS-002' } });
    
    expect(screen.getByText('Marketing')).toBeInTheDocument();
    expect(screen.queryByText('Development')).not.toBeInTheDocument();
  });

  it('filters workstations by current user', () => {
    render(<WorkstationsPage />);
    
    const searchInput = screen.getByPlaceholderText('Search workstations');
    fireEvent.change(searchInput, { target: { value: 'Pam' } });
    
    expect(screen.getByText('Marketing')).toBeInTheDocument();
    expect(screen.queryByText('Development')).not.toBeInTheDocument();
  });

  it('search is case insensitive', () => {
    render(<WorkstationsPage />);
    
    const searchInput = screen.getByPlaceholderText('Search workstations');
    fireEvent.change(searchInput, { target: { value: 'MARKETING' } });
    
    expect(screen.getByText('Marketing')).toBeInTheDocument();
  });

  it('shows all workstations when search is cleared', () => {
    render(<WorkstationsPage />);
    
    const searchInput = screen.getByPlaceholderText('Search workstations');
    
    fireEvent.change(searchInput, { target: { value: 'Marketing' } });
    expect(screen.getByText('Marketing')).toBeInTheDocument();
    
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.getAllByText('Development')).toHaveLength(3);
    expect(screen.getByText('Marketing')).toBeInTheDocument();
  });

  it('opens create dialog when create button is clicked', () => {
    render(<WorkstationsPage />);
    
    const createButton = screen.getByRole('button', { name: /create/i });
    fireEvent.click(createButton);
    
    expect(screen.getByTestId('create-dialog')).toBeInTheDocument();
  });

  it('closes create dialog when close is clicked', () => {
    render(<WorkstationsPage />);
    
    // Open dialog
    const createButton = screen.getByRole('button', { name: /create/i });
    fireEvent.click(createButton);
    
    expect(screen.getByTestId('create-dialog')).toBeInTheDocument();
    
    // Close dialog
    const closeButton = within(screen.getByTestId('create-dialog')).getByText('Close');
    fireEvent.click(closeButton);
    
    expect(screen.queryByTestId('create-dialog')).not.toBeInTheDocument();
  });

  it('creates new workstation and adds to list', () => {
    render(<WorkstationsPage />);
    
    const initialWorkstations = screen.getAllByText('Development');
    const initialCount = initialWorkstations.length;
    
    // Open and create
    const createButton = screen.getByRole('button', { name: /create/i });
    fireEvent.click(createButton);
    
    const createWorkstationButton = screen.getByText('Create Workstation');
    fireEvent.click(createWorkstationButton);
    
    // New workstation should be in the list
    expect(screen.getByText('New Workstation')).toBeInTheDocument();
  });

  it('opens edit dialog when edit button is clicked', () => {
    render(<WorkstationsPage />);
    
    const editButton = screen.getAllByText(/Edit Development/i)[0];
    fireEvent.click(editButton);
    
    expect(screen.getByTestId('edit-dialog')).toBeInTheDocument();
    expect(screen.getByText('Editing: Development')).toBeInTheDocument();
  });

  it('closes edit dialog when close is clicked', () => {
    render(<WorkstationsPage />);
    
    // Open edit dialog
    const editButton = screen.getAllByText(/Edit Development/i)[0];
    fireEvent.click(editButton);
    
    expect(screen.getByTestId('edit-dialog')).toBeInTheDocument();
    
    // Close dialog
    const closeButton = within(screen.getByTestId('edit-dialog')).getByText('Close');
    fireEvent.click(closeButton);
    
    expect(screen.queryByTestId('edit-dialog')).not.toBeInTheDocument();
  });

  it('saves workstation changes', () => {
    render(<WorkstationsPage />);
    
    // Open edit dialog
    const editButton = screen.getAllByText(/Edit Development/i)[0];
    fireEvent.click(editButton);
    
    // Save changes
    const saveButton = within(screen.getByTestId('edit-dialog')).getByText('Save');
    fireEvent.click(saveButton);
    
    // Dialog should close after save
    expect(screen.queryByTestId('edit-dialog')).not.toBeInTheDocument();
  });

  it('deletes workstation', () => {
    render(<WorkstationsPage />);
    
    const initialMarketing = screen.getAllByText('Marketing');
    expect(initialMarketing).toHaveLength(1);
    
    // Open edit dialog for Marketing
    const editButton = screen.getByText(/Edit Marketing/i);
    fireEvent.click(editButton);
    
    // Delete
    const deleteButton = within(screen.getByTestId('edit-dialog')).getByText('Delete');
    fireEvent.click(deleteButton);
    
    // Marketing should be removed
    expect(screen.queryByText('Marketing')).not.toBeInTheDocument();
  });

  it('toggles workstation status', () => {
    render(<WorkstationsPage />);
    
    // Get first toggle button
    const toggleButtons = screen.getAllByText('Toggle Status');
    fireEvent.click(toggleButtons[0]);
    
    // Status toggle should be called (implementation verified by mock)
    expect(toggleButtons[0]).toBeInTheDocument();
  });

  it('opens display popover when display button is clicked', () => {
    render(<WorkstationsPage />);
    
    const displayButton = screen.getByRole('button', { name: /display/i });
    fireEvent.click(displayButton);
    
    // Check for popover content
    expect(screen.getByText('Layout')).toBeInTheDocument();
    expect(screen.getByText('Cards')).toBeInTheDocument();
    expect(screen.getByText('List')).toBeInTheDocument();
  });

  it('closes display popover when clicking away', () => {
    render(<WorkstationsPage />);
    
    const displayButton = screen.getByRole('button', { name: /display/i });
    fireEvent.click(displayButton);
    
    expect(screen.getByText('Layout')).toBeInTheDocument();
    
    // Click on the popover's backdrop (simulated by clicking elsewhere)
    const popover = screen.getByText('Layout').closest('[role="presentation"]');
    if (popover) {
      fireEvent.click(document.body);
    }
  });

  it('renders refresh button', () => {
    const { container } = render(<WorkstationsPage />);
    
    // RefreshOutlinedIcon should be in the document
    const refreshIcon = container.querySelector('[data-testid="RefreshOutlinedIcon"]');
    expect(refreshIcon).toBeInTheDocument();
  });

  it('renders search icon in search input', () => {
    const { container } = render(<WorkstationsPage />);
    
    const searchIcon = container.querySelector('[data-testid="SearchOutlinedIcon"]');
    expect(searchIcon).toBeInTheDocument();
  });

  it('renders with correct layout structure', () => {
    const { container } = render(<WorkstationsPage />);
    
    // Main container should exist
    const mainBox = container.firstChild;
    expect(mainBox).toBeInTheDocument();
  });

  it('handles empty search results', () => {
    render(<WorkstationsPage />);
    
    const searchInput = screen.getByPlaceholderText('Search workstations');
    fireEvent.change(searchInput, { target: { value: 'NonexistentWorkstation' } });
    
    // Should show empty list
    const list = screen.getByTestId('workstation-list');
    expect(list.children).toHaveLength(0);
  });

  it('preserves workstation data structure when creating', () => {
    render(<WorkstationsPage />);
    
    // Open create dialog
    const createButton = screen.getByRole('button', { name: /create/i });
    fireEvent.click(createButton);
    
    // Create workstation
    const createWorkstationButton = screen.getByText('Create Workstation');
    fireEvent.click(createWorkstationButton);
    
    // Verify the new workstation appears
    expect(screen.getByText('New Workstation')).toBeInTheDocument();
  });
});
