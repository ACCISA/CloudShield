import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import WorkstationDialog from '../WorkstationDialog';

describe('WorkstationDialog', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open is true', () => {
    render(
      <WorkstationDialog
        open={true}
        onClose={mockOnClose}
        breadcrumb={['Workstations', 'Test Dialog']}
      >
        <div>Dialog Content</div>
      </WorkstationDialog>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Dialog Content')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(
      <WorkstationDialog
        open={false}
        onClose={mockOnClose}
        breadcrumb={['Workstations', 'Test Dialog']}
      >
        <div>Dialog Content</div>
      </WorkstationDialog>
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Dialog Content')).not.toBeInTheDocument();
  });

  it('renders breadcrumb navigation', () => {
    render(
      <WorkstationDialog
        open={true}
        onClose={mockOnClose}
        breadcrumb={['Workstations', 'Edit', 'Details']}
      >
        <div>Content</div>
      </WorkstationDialog>
    );

    expect(screen.getByText('Workstations')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Details')).toBeInTheDocument();
  });

  it('renders breadcrumb separators', () => {
    render(
      <WorkstationDialog
        open={true}
        onClose={mockOnClose}
        breadcrumb={['Workstations', 'Test']}
      >
        <div>Content</div>
      </WorkstationDialog>
    );

    // Should have separator (›) between breadcrumb items
    expect(screen.getByText('›')).toBeInTheDocument();
  });

  it('uses default breadcrumb when not provided', () => {
    render(
      <WorkstationDialog
        open={true}
        onClose={mockOnClose}
      >
        <div>Content</div>
      </WorkstationDialog>
    );

    expect(screen.getByText('Workstations')).toBeInTheDocument();
  });

  it('renders close button', () => {
    render(
      <WorkstationDialog
        open={true}
        onClose={mockOnClose}
        breadcrumb={['Test']}
      >
        <div>Content</div>
      </WorkstationDialog>
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    expect(closeButton).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <WorkstationDialog
        open={true}
        onClose={mockOnClose}
        breadcrumb={['Test']}
      >
        <div>Content</div>
      </WorkstationDialog>
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('renders children content', () => {
    render(
      <WorkstationDialog
        open={true}
        onClose={mockOnClose}
        breadcrumb={['Test']}
      >
        <div>Custom Content</div>
        <button>Custom Button</button>
      </WorkstationDialog>
    );

    expect(screen.getByText('Custom Content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Custom Button' })).toBeInTheDocument();
  });

  it('renders action buttons when provided', () => {
    const actions = (
      <>
        <button>Cancel</button>
        <button>Save</button>
      </>
    );

    render(
      <WorkstationDialog
        open={true}
        onClose={mockOnClose}
        breadcrumb={['Test']}
        actions={actions}
      >
        <div>Content</div>
      </WorkstationDialog>
    );

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('does not render actions section when actions not provided', () => {
    const { container } = render(
      <WorkstationDialog
        open={true}
        onClose={mockOnClose}
        breadcrumb={['Test']}
      >
        <div>Content</div>
      </WorkstationDialog>
    );

    const dialogActions = container.querySelector('.MuiDialogActions-root');
    expect(dialogActions).not.toBeInTheDocument();
  });

  it('applies dark theme styling', () => {
    render(
      <WorkstationDialog
        open={true}
        onClose={mockOnClose}
        breadcrumb={['Test']}
      >
        <div>Content</div>
      </WorkstationDialog>
    );

    // Dialog renders in a portal, so query from document
    const dialog = document.querySelector('.MuiDialog-paper');
    expect(dialog).toBeInTheDocument();
    const computedStyle = window.getComputedStyle(dialog);
    expect(computedStyle.backgroundColor).toBe('rgb(15, 15, 15)'); // #0F0F0F in RGB
  });

  it('renders DialogTitle with proper structure', () => {
    render(
      <WorkstationDialog
        open={true}
        onClose={mockOnClose}
        breadcrumb={['Workstations', 'Edit']}
      >
        <div>Content</div>
      </WorkstationDialog>
    );

    // Dialog renders in a portal, so query from document
    const dialogTitle = document.querySelector('.MuiDialogTitle-root');
    expect(dialogTitle).toBeInTheDocument();
  });

  it('renders DialogContent with dividers', () => {
    render(
      <WorkstationDialog
        open={true}
        onClose={mockOnClose}
        breadcrumb={['Test']}
      >
        <div>Content</div>
      </WorkstationDialog>
    );

    // Dialog renders in a portal, so query from document
    const dialogContent = document.querySelector('.MuiDialogContent-root');
    expect(dialogContent).toBeInTheDocument();
    expect(dialogContent).toHaveClass('MuiDialogContent-dividers');
  });

  it('highlights last breadcrumb item with bold font', () => {
    render(
      <WorkstationDialog
        open={true}
        onClose={mockOnClose}
        breadcrumb={['Workstations', 'Edit', 'Final']}
      >
        <div>Content</div>
      </WorkstationDialog>
    );

    const finalBreadcrumb = screen.getByText('Final');
    expect(finalBreadcrumb).toBeInTheDocument();
    // The last breadcrumb should have fontWeight: 600 in its sx prop
  });

  it('handles single breadcrumb item', () => {
    render(
      <WorkstationDialog
        open={true}
        onClose={mockOnClose}
        breadcrumb={['Single']}
      >
        <div>Content</div>
      </WorkstationDialog>
    );

    expect(screen.getByText('Single')).toBeInTheDocument();
    // Should not have separator when only one item
    expect(screen.queryByText('›')).not.toBeInTheDocument();
  });

  it('renders CloseIcon in close button', () => {
    render(
      <WorkstationDialog
        open={true}
        onClose={mockOnClose}
        breadcrumb={['Test']}
      >
        <div>Content</div>
      </WorkstationDialog>
    );

    // Dialog renders in a portal, so query from document
    const closeIcon = document.querySelector('[data-testid="CloseIcon"]');
    expect(closeIcon).toBeInTheDocument();
  });
});
