import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import WorkstationList from '../WorkstationList';

describe('WorkstationList', () => {
  const mockRows = [
    {
      id: 1,
      name: 'Workstation 1',
      code: 'WS-001',
      usersCount: 5,
      currentUser: 'John Doe',
      lastUsed: '2 hours ago',
      status: 'connected',
    },
    {
      id: 2,
      name: 'Workstation 2',
      code: 'WS-002',
      usersCount: 3,
      currentUser: 'Jane Smith',
      lastUsed: '1 day ago',
      status: 'busy',
    },
  ];

  const mockOnEdit = jest.fn();
  const mockOnToggleStatus = jest.fn();

  beforeEach(() => {
    mockOnEdit.mockClear();
    mockOnToggleStatus.mockClear();
  });

  it('renders workstation rows', () => {
    render(
      <WorkstationList
        rows={mockRows}
        onEdit={mockOnEdit}
        onToggleStatus={mockOnToggleStatus}
      />
    );
    expect(screen.getByText('Workstation 1')).toBeInTheDocument();
    expect(screen.getByText('Workstation 2')).toBeInTheDocument();
  });

  it('displays workstation codes', () => {
    render(
      <WorkstationList
        rows={mockRows}
        onEdit={mockOnEdit}
        onToggleStatus={mockOnToggleStatus}
      />
    );
    expect(screen.getByText('↳ WS-001')).toBeInTheDocument();
    expect(screen.getByText('↳ WS-002')).toBeInTheDocument();
  });

  it('displays user counts', () => {
    render(
      <WorkstationList
        rows={mockRows}
        onEdit={mockOnEdit}
        onToggleStatus={mockOnToggleStatus}
      />
    );
    // The component displays "+2" for the extra users (5 total - 3 shown = 2 extra)
    expect(screen.getByText('+ 2')).toBeInTheDocument();
    // For workstation 2, 3 users total with 3 shown = no extra count displayed
  });

  it('displays current users', () => {
    render(
      <WorkstationList
        rows={mockRows}
        onEdit={mockOnEdit}
        onToggleStatus={mockOnToggleStatus}
      />
    );
    // Users are displayed as avatars with initials, not full names
    // Check for the initials instead
    expect(screen.getByText('JD')).toBeInTheDocument(); // John Doe
    expect(screen.getByText('JS')).toBeInTheDocument(); // Jane Smith
  });

  it('displays last used times', () => {
    render(
      <WorkstationList
        rows={mockRows}
        onEdit={mockOnEdit}
        onToggleStatus={mockOnToggleStatus}
      />
    );
    expect(screen.getByText('2 hours ago')).toBeInTheDocument();
    expect(screen.getByText('1 day ago')).toBeInTheDocument();
  });

  it('renders checkboxes for each row', () => {
    render(
      <WorkstationList
        rows={mockRows}
        onEdit={mockOnEdit}
        onToggleStatus={mockOnToggleStatus}
      />
    );
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(mockRows.length);
  });

  it('calls onToggleStatus when connect/disconnect button is clicked', () => {
    render(
      <WorkstationList
        rows={mockRows}
        onEdit={mockOnEdit}
        onToggleStatus={mockOnToggleStatus}
      />
    );
    
    // The status chips are clickable via their container Box
    // Find the "Connect" chip (first workstation has status 'connected')
    const connectChip = screen.getByText('Connect');
    expect(connectChip).toBeInTheDocument();
    
    // Click the chip
    fireEvent.click(connectChip);
    expect(mockOnToggleStatus).toHaveBeenCalledWith(1);
  });

  it('calls onEdit when edit button is clicked', () => {
    render(
      <WorkstationList
        rows={mockRows}
        onEdit={mockOnEdit}
        onToggleStatus={mockOnToggleStatus}
      />
    );
    const editButtons = screen.getAllByLabelText(/edit/i);
    fireEvent.click(editButtons[0]);
    expect(mockOnEdit).toHaveBeenCalledWith(mockRows[0]);
  });

  it('renders empty list when no rows provided', () => {
    const { container } = render(
      <WorkstationList
        rows={[]}
        onEdit={mockOnEdit}
        onToggleStatus={mockOnToggleStatus}
      />
    );
    const listItems = container.querySelectorAll('[role="checkbox"]');
    expect(listItems.length).toBe(0);
  });

  it('displays status chip for connected workstation', () => {
    render(
      <WorkstationList
        rows={[mockRows[0]]}
        onEdit={mockOnEdit}
        onToggleStatus={mockOnToggleStatus}
      />
    );
    expect(screen.getByText('Connect')).toBeInTheDocument();
  });

  it('displays status chip for busy workstation', () => {
    render(
      <WorkstationList
        rows={[mockRows[1]]}
        onEdit={mockOnEdit}
        onToggleStatus={mockOnToggleStatus}
      />
    );
    expect(screen.getByText('Disconnect')).toBeInTheDocument();
  });
});
