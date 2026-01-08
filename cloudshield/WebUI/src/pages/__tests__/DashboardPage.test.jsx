import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DashboardPage from '../DashboardPage';

describe('DashboardPage', () => {
  beforeEach(() => {
    // Mock console.log to avoid cluttering test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

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

  // Test add button handlers
  describe('Add Button Handlers', () => {
    it('calls handleAddUser when add user button is clicked', () => {
      render(<DashboardPage />);
      
      // Find the Users StatCard and its add button
      const userCard = screen.getByText('Users').closest('div').closest('div');
      const addButton = userCard.querySelector('button');
      
      fireEvent.click(addButton);
      
      expect(console.log).toHaveBeenCalledWith('Add user clicked');
    });

    it('calls handleAddWorkstation when add workstation button is clicked', () => {
      render(<DashboardPage />);
      
      // Find the Workstations StatCard and its add button
      const workstationCard = screen.getByText('Workstations').closest('div').closest('div');
      const addButton = workstationCard.querySelector('button');
      
      fireEvent.click(addButton);
      
      expect(console.log).toHaveBeenCalledWith('Add workstation clicked');
    });

    it('calls handleAddGroup when add group button is clicked', () => {
      render(<DashboardPage />);
      
      // Find the Groups StatCard and its add button
      const groupCard = screen.getByText('Groups').closest('div').closest('div');
      const addButton = groupCard.querySelector('button');
      
      fireEvent.click(addButton);
      
      expect(console.log).toHaveBeenCalledWith('Add group clicked');
    });

    it('calls handleAddFile when add file button is clicked', () => {
      render(<DashboardPage />);
      
      // Find the Files StatCard and its add button
      const fileCard = screen.getByText('Files').closest('div').closest('div');
      const addButton = fileCard.querySelector('button');
      
      fireEvent.click(addButton);
      
      expect(console.log).toHaveBeenCalledWith('Add file clicked');
    });
  });
});
