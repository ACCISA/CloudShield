import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import CreateUserIcon from '../CreateUserIcon';

describe('CreateUserIcon', () => {
  it('renders without crashing', () => {
    const { container } = render(<CreateUserIcon />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders with default props', () => {
    const { container } = render(<CreateUserIcon />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveAttribute('width', '16');
    expect(svg).toHaveAttribute('height', '16');
    expect(svg).toHaveAttribute('viewBox', '0 0 16 16');
  });

  it('renders with custom width and height', () => {
    const { container } = render(<CreateUserIcon width={20} height={24} />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveAttribute('width', '20');
    expect(svg).toHaveAttribute('height', '24');
  });

  it('renders with custom color', () => {
    const { container } = render(<CreateUserIcon color="#0099FF" />);
    const svg = container.querySelector('svg');
    const paths = svg.querySelectorAll('path');
    
    let hasCustomColor = false;
    paths.forEach(path => {
      if (path.getAttribute('stroke') === '#0099FF') {
        hasCustomColor = true;
      }
    });
    
    expect(hasCustomColor).toBe(true);
  });

  it('applies className prop', () => {
    const { container } = render(<CreateUserIcon className="icon-user" />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveClass('icon-user');
  });

  it('renders all path elements', () => {
    const { container } = render(<CreateUserIcon />);
    const svg = container.querySelector('svg');
    const paths = svg.querySelectorAll('path');
    
    expect(paths.length).toBeGreaterThan(0);
  });

  it('renders with correct viewBox', () => {
    const { container } = render(<CreateUserIcon />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveAttribute('viewBox', '0 0 16 16');
  });

  it('renders with fill="none"', () => {
    const { container } = render(<CreateUserIcon />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveAttribute('fill', 'none');
  });

  it('renders with strokeLinecap and strokeLinejoin attributes on paths', () => {
    const { container } = render(<CreateUserIcon />);
    const svg = container.querySelector('svg');
    const paths = svg.querySelectorAll('path');
    
    let hasStrokeAttributes = false;
    paths.forEach(path => {
      if (path.getAttribute('strokeLinecap') || path.getAttribute('strokeLinejoin')) {
        hasStrokeAttributes = true;
      }
    });
    
    expect(hasStrokeAttributes).toBe(true);
  });

  it('renders with default color white', () => {
    const { container } = render(<CreateUserIcon />);
    const svg = container.querySelector('svg');
    const paths = svg.querySelectorAll('path');
    
    let hasWhiteColor = false;
    paths.forEach(path => {
      if (path.getAttribute('stroke') === 'white') {
        hasWhiteColor = true;
      }
    });
    
    expect(hasWhiteColor).toBe(true);
  });

  it('renders multiple paths for icon', () => {
    const { container } = render(<CreateUserIcon />);
    const svg = container.querySelector('svg');
    const paths = svg.querySelectorAll('path');
    
    // CreateUserIcon should have 4 paths based on the icon
    expect(paths.length).toBe(4);
  });

  it('renders with namespace', () => {
    const { container } = render(<CreateUserIcon />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
  });

  it('renders with combined props', () => {
    const { container } = render(
      <CreateUserIcon 
        width={32} 
        height={32} 
        color="#FF00FF"
        className="large-icon purple"
      />
    );
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveAttribute('width', '32');
    expect(svg).toHaveAttribute('height', '32');
    expect(svg).toHaveClass('large-icon');
    expect(svg).toHaveClass('purple');
  });
});
