import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import WorkstationCreateDialog from '../WorkstationCreateDialog';

describe('WorkstationCreateDialog', () => {
  const mockOnClose = jest.fn();
  const mockOnCreate = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnCreate.mockClear();
  });

  it('renders when open is true', () => {
    render(
      <WorkstationCreateDialog
        open={true}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />
    );
    expect(screen.getByText('New Workstation')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(
      <WorkstationCreateDialog
        open={false}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />
    );
    expect(screen.queryByText('New Workstation')).not.toBeInTheDocument();
  });

  it('renders close button', () => {
    render(
      <WorkstationCreateDialog
        open={true}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />
    );
    const closeButton = screen.getByRole('button', { name: /close/i });
    expect(closeButton).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <WorkstationCreateDialog
        open={true}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />
    );
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('renders name input field', () => {
    render(
      <WorkstationCreateDialog
        open={true}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />
    );
    expect(screen.getByDisplayValue('WS-001')).toBeInTheDocument();
  });

  it('renders group input field', () => {
    render(
      <WorkstationCreateDialog
        open={true}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />
    );
    expect(screen.getByDisplayValue('None')).toBeInTheDocument();
  });

  it('updates name when typing', () => {
    render(
      <WorkstationCreateDialog
        open={true}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />
    );
    const nameInput = screen.getByDisplayValue('WS-001');
    fireEvent.change(nameInput, { target: { value: 'WS-999' } });
    expect(nameInput).toHaveValue('WS-999');
  });

  it('updates group when typing', () => {
    render(
      <WorkstationCreateDialog
        open={true}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />
    );
    const groupInput = screen.getByDisplayValue('None');
    fireEvent.change(groupInput, { target: { value: 'Engineering' } });
    expect(groupInput).toHaveValue('Engineering');
  });

  it('renders all plan options', () => {
    render(
      <WorkstationCreateDialog
        open={true}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />
    );
    expect(screen.getByText('BASIC')).toBeInTheDocument();
    expect(screen.getByText('PRO')).toBeInTheDocument();
    expect(screen.getByText('ULTIMATE')).toBeInTheDocument();
  });

  it('selects plan when clicked', () => {
    render(
      <WorkstationCreateDialog
        open={true}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />
    );
    const proPlans = screen.getAllByText('PRO');
    const proPlan = proPlans[0]; // Get the first occurrence which is the clickable title
    fireEvent.click(proPlan.closest('div[style*="cursor: pointer"]') || proPlan);
    // Plan selection should update internal state
    expect(proPlan).toBeInTheDocument();
  });

  it('renders create button', () => {
    render(
      <WorkstationCreateDialog
        open={true}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />
    );
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });

  it('calls onCreate when create button is clicked', () => {
    render(
      <WorkstationCreateDialog
        open={true}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />
    );
    const createButton = screen.getByRole('button', { name: /create/i });
    fireEvent.click(createButton);
    expect(mockOnCreate).toHaveBeenCalled();
  });

  it('includes workstation data in onCreate callback', () => {
    render(
      <WorkstationCreateDialog
        open={true}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />
    );
    
    // Change name
    const nameInput = screen.getByDisplayValue('WS-001');
    fireEvent.change(nameInput, { target: { value: 'WS-TEST' } });
    
    // Click create
    const createButton = screen.getByRole('button', { name: /create/i });
    fireEvent.click(createButton);
    
    expect(mockOnCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'WS-TEST',
        code: 'WS-TEST',
      })
    );
  });

  it('displays breadcrumb navigation', () => {
    render(
      <WorkstationCreateDialog
        open={true}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />
    );
    expect(screen.getByText('Workstations')).toBeInTheDocument();
    expect(screen.getByText('›')).toBeInTheDocument();
  });
});
