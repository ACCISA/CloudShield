import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ActivityPanel from '../ActivityPanel';

describe('ActivityPanel', () => {
  it('renders recent activity title', () => {
    render(<ActivityPanel />);
    expect(screen.getByText('Recent activity')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<ActivityPanel />);
    expect(screen.getByPlaceholderText('Search activities')).toBeInTheDocument();
  });

  it('renders refresh button', () => {
    render(<ActivityPanel />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('updates search value when typing', () => {
    render(<ActivityPanel />);
    const searchInput = screen.getByPlaceholderText('Search activities');
    fireEvent.change(searchInput, { target: { value: 'test search' } });
    expect(searchInput).toHaveValue('test search');
  });

  it('displays activity items', () => {
    render(<ActivityPanel />);
    // Check for mock activity data
    const activities = screen.getAllByText('Michael Scott');
    expect(activities.length).toBeGreaterThan(0);
  });

  it('displays activity dates', () => {
    render(<ActivityPanel />);
    const dates = screen.getAllByText('10/11/2025 11:36 pm');
    expect(dates.length).toBeGreaterThan(0);
  });

  it('displays activity descriptions', () => {
    render(<ActivityPanel />);
    const descriptions = screen.getAllByText('Uploaded file to group');
    expect(descriptions.length).toBeGreaterThan(0);
  });

  it('renders with correct styling', () => {
    const { container } = render(<ActivityPanel />);
    const mainBox = container.firstChild;
    expect(mainBox).toHaveStyle({ display: 'flex', flexDirection: 'column' });
  });
});
