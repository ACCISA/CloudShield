import React from 'react';
import { render, screen } from '@testing-library/react';
import StatCard from '../StatCard';

describe('StatCard', () => {
  it('renders title and value', () => {
    render(<StatCard title="Total Users" value="150" />);
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
  });

  it('renders default change text', () => {
    render(<StatCard title="Workstations" value="42" />);
    expect(screen.getByText('15.2% ↑')).toBeInTheDocument();
  });

  it('renders custom change text', () => {
    render(<StatCard title="Groups" value="10" changeText="5% ↓" />);
    expect(screen.getByText('5% ↓')).toBeInTheDocument();
  });

  it('renders add button', () => {
    render(<StatCard title="Files" value="250" />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('applies custom gradient colors', () => {
    const { container } = render(
      <StatCard
        title="Custom"
        value="99"
        gradientFrom="#ff0000"
        gradientTo="#00ff00"
      />
    );
    const box = container.firstChild;
    expect(box).toHaveStyle({
      background: 'linear-gradient(135deg, #ff0000 0%, #00ff00 100%)',
    });
  });

  it('applies default gradient colors', () => {
    const { container } = render(<StatCard title="Default" value="100" />);
    const box = container.firstChild;
    expect(box).toHaveStyle({
      background: 'linear-gradient(135deg, #6a5acd 0%, #9f7aea 100%)',
    });
  });

  it('renders numeric value', () => {
    render(<StatCard title="Count" value={42} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders string value', () => {
    render(<StatCard title="Status" value="Active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });
});
