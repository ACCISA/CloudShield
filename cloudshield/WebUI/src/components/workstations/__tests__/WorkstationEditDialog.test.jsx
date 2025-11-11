import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import WorkstationEditDialog from '../WorkstationEditDialog';

describe('WorkstationEditDialog', () => {
  const mockRow = {
    id: 1,
    name: 'Workstation 1',
    code: 'WS-001',
    currentUser: 'John Doe',
    usersCount: 3,
    status: 'connected',
  };

  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnSave.mockClear();
    mockOnDelete.mockClear();
  });

  it('renders when open is true', () => {
    render(
      <WorkstationEditDialog
        open={true}
        onClose={mockOnClose}
        row={mockRow}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByText('Edit Workstation')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(
      <WorkstationEditDialog
        open={false}
        onClose={mockOnClose}
        row={mockRow}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.queryByText('Edit Workstation')).not.toBeInTheDocument();
  });

  it('renders close button', () => {
    render(
      <WorkstationEditDialog
        open={true}
        onClose={mockOnClose}
        row={mockRow}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
      />
    );
    const closeButton = screen.getByRole('button', { name: /close/i });
    expect(closeButton).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <WorkstationEditDialog
        open={true}
        onClose={mockOnClose}
        row={mockRow}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
      />
    );
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('populates name field with existing workstation name', () => {
    render(
      <WorkstationEditDialog
        open={true}
        onClose={mockOnClose}
        row={mockRow}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByDisplayValue('Workstation 1')).toBeInTheDocument();
  });

  it('updates name when typing', () => {
    render(
      <WorkstationEditDialog
        open={true}
        onClose={mockOnClose}
        row={mockRow}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
      />
    );
    const nameInput = screen.getByDisplayValue('Workstation 1');
    fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
    expect(nameInput).toHaveValue('Updated Name');
  });

  it('renders all plan options', () => {
    render(
      <WorkstationEditDialog
        open={true}
        onClose={mockOnClose}
        row={mockRow}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByText('BASIC')).toBeInTheDocument();
    expect(screen.getByText('PRO')).toBeInTheDocument();
    expect(screen.getByText('ULTIMATE')).toBeInTheDocument();
  });

  it('renders save button', () => {
    render(
      <WorkstationEditDialog
        open={true}
        onClose={mockOnClose}
        row={mockRow}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });

  it('calls onSave when save button is clicked', () => {
    render(
      <WorkstationEditDialog
        open={true}
        onClose={mockOnClose}
        row={mockRow}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
      />
    );
    const saveButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(saveButton);
    expect(mockOnSave).toHaveBeenCalled();
  });

  it('includes updated data in onSave callback', () => {
    render(
      <WorkstationEditDialog
        open={true}
        onClose={mockOnClose}
        row={mockRow}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
      />
    );
    
    // Update name
    const nameInput = screen.getByDisplayValue('Workstation 1');
    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    
    // Click save
    const saveButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(saveButton);
    
    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New Name',
        code: 'WS-001',
      })
    );
  });

  it('renders delete button', () => {
    render(
      <WorkstationEditDialog
        open={true}
        onClose={mockOnClose}
        row={mockRow}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
      />
    );
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    expect(deleteButton).toBeInTheDocument();
  });

  it('calls onDelete when delete button is clicked', () => {
    render(
      <WorkstationEditDialog
        open={true}
        onClose={mockOnClose}
        row={mockRow}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
      />
    );
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);
    expect(mockOnDelete).toHaveBeenCalled();
  });

  it('displays breadcrumb navigation', () => {
    render(
      <WorkstationEditDialog
        open={true}
        onClose={mockOnClose}
        row={mockRow}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByText('Workstations')).toBeInTheDocument();
    expect(screen.getByText('›')).toBeInTheDocument();
  });

  it('handles undefined row gracefully', () => {
    render(
      <WorkstationEditDialog
        open={true}
        onClose={mockOnClose}
        row={null}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByText('Edit Workstation')).toBeInTheDocument();
  });
});
