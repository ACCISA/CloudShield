import React from 'react';
import { render, screen } from '@testing-library/react';
import ProvisioningControls from '../ProvisioningControls';

describe('ProvisioningControls', () => {
  it('renders base layout and "No job started yet." when no jobId', () => {
    render(<ProvisioningControls status="idle" />);
    expect(screen.getByText(/^Status:\s*idle$/i)).toBeInTheDocument();
    expect(screen.getByText(/No job started yet\./i)).toBeInTheDocument();
  });

  it('shows Job ID when provided', () => {
    render(<ProvisioningControls status="running" jobId="JOB-42" />);
    expect(screen.getByText(/^Status:\s*running$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Job ID:\s*JOB-42$/i)).toBeInTheDocument();
  });

  it('renders message when provided', () => {
    render(<ProvisioningControls status="running" message="Provisioning in progress" />);
    expect(screen.getByText(/Provisioning in progress/i)).toBeInTheDocument();
  });

  it('renders progress chip for numeric progress, including 0 and NaN (per current impl)', () => {
    const { rerender } = render(<ProvisioningControls status="running" progress={0} />);
    expect(screen.getByText(/^Progress:\s*0%$/i)).toBeInTheDocument();

    rerender(<ProvisioningControls status="running" progress={37} />);
    expect(screen.getByText(/^Progress:\s*37%$/i)).toBeInTheDocument();

    // typeof NaN === 'number', so current code will render "NaN%"
    rerender(<ProvisioningControls status="running" progress={Number.NaN} />);
    expect(screen.getByText(/^Progress:\s*NaN%$/i)).toBeInTheDocument();
  });

  it('does not render progress chip for undefined or non-number', () => {
    const { rerender } = render(<ProvisioningControls status="running" />);
    expect(screen.queryByText(/Progress:/i)).not.toBeInTheDocument();

    // @ts-expect-error deliberate wrong type to assert runtime behavior
    rerender(<ProvisioningControls status="running" progress={"50"} />);
    expect(screen.queryByText(/Progress:/i)).not.toBeInTheDocument();
  });

  describe('status → MUI Chip color mapping', () => {
    // We assert via MUI’s color class applied to the Chip element that wraps the label.
    // Expected classes (MUI v7): MuiChip-colorSuccess | MuiChip-colorError | MuiChip-colorInfo | MuiChip-colorDefault
    const cases = [
      { status: 'succeeded', expectedClass: /MuiChip-colorSuccess/ },
      { status: 'failed', expectedClass: /MuiChip-colorError/ },
      { status: 'running', expectedClass: /MuiChip-colorInfo/ },
      { status: 'starting', expectedClass: /MuiChip-colorInfo/ },
      { status: 'queued', expectedClass: /MuiChip-colorDefault/ },
      { status: 'idle', expectedClass: /MuiChip-colorDefault/ },
      { status: 'whatever', expectedClass: /MuiChip-colorDefault/ },
    ];

    test.each(cases)('applies correct color for status "%s"', ({ status, expectedClass }) => {
      render(<ProvisioningControls status={status} />);
      const statusChip = screen.getByText(new RegExp(`^Status:\\s*${status}$`, 'i')).closest('.MuiChip-root');
      expect(statusChip).toBeInTheDocument();
      expect(statusChip.className).toMatch(expectedClass);
    });
  });
});
