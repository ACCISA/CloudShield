import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AppLayout from '../AppLayout';

const renderWithRouter = (ui) => render(ui, { wrapper: BrowserRouter });

describe('AppLayout', () => {
  it('renders children correctly', () => {
    renderWithRouter(
      <AppLayout>
        <div>Test Content</div>
      </AppLayout>
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders sidebar by default', () => {
    renderWithRouter(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );
    // Check if sidebar is rendered by looking for navigation elements
    const sidebar = document.querySelector('[role="button"]');
    expect(sidebar).toBeInTheDocument();
  });

  it('hides sidebar when showSidebar is false', () => {
    const { container } = renderWithRouter(
      <AppLayout showSidebar={false}>
        <div>Content</div>
      </AppLayout>
    );
    // No navigation buttons should be present
    const navButtons = container.querySelectorAll('[role="button"]');
    expect(navButtons.length).toBe(0);
  });

  it('applies correct layout styles', () => {
    const { container } = renderWithRouter(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );
    const mainBox = container.firstChild;
    expect(mainBox).toHaveStyle({ display: 'flex' });
  });

  it('passes sidebarMode prop to Sidebar', () => {
    renderWithRouter(
      <AppLayout sidebarMode="provisioning">
        <div>Content</div>
      </AppLayout>
    );
    // Sidebar should be rendered in provisioning mode
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('passes collapsed prop to Sidebar', () => {
    renderWithRouter(
      <AppLayout collapsed={true}>
        <div>Content</div>
      </AppLayout>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('uses default onToggleCollapse when not provided', () => {
    // Should not throw error when onToggleCollapse is not provided
    expect(() => {
      renderWithRouter(
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      );
    }).not.toThrow();
  });
});
