import React from 'react';
import { render, screen } from '@testing-library/react';
import DashboardPage from '../DashboardPage';

describe('DashboardPage', () => {
  it('renders all stat cards', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Workstations')).toBeInTheDocument();
    expect(screen.getByText('Groups')).toBeInTheDocument();
    expect(screen.getByText('Files')).toBeInTheDocument();
  });

  it('displays correct stat values', () => {
    render(<DashboardPage />);
    expect(screen.getByText('16')).toBeInTheDocument(); // Users
    expect(screen.getByText('12')).toBeInTheDocument(); // Workstations
    expect(screen.getByText('3')).toBeInTheDocument(); // Groups
    expect(screen.getByText('33')).toBeInTheDocument(); // Files
  });

  it('renders activity panel', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Recent activity')).toBeInTheDocument();
  });

  it('applies correct layout styles', () => {
    const { container } = render(<DashboardPage />);
    const mainBox = container.firstChild;
    expect(mainBox).toHaveStyle({ display: 'flex', flexDirection: 'column' });
  });

  it('renders stat cards in a row', () => {
    render(<DashboardPage />);
    // Check for StatCard content which indicates the cards rendered
    expect(screen.getByText('Workstations')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
  });
});
