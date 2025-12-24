import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import CreateGroupIcon from '../CreateGroupIcon';

describe('CreateGroupIcon', () => {
  it('renders without crashing', () => {
    const { container } = render(<CreateGroupIcon />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders with default props', () => {
    const { container } = render(<CreateGroupIcon />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveAttribute('width', '16');
    expect(svg).toHaveAttribute('height', '16');
    expect(svg).toHaveAttribute('viewBox', '0 0 16 16');
  });

  it('renders with custom width and height', () => {
    const { container } = render(<CreateGroupIcon width={24} height={32} />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '32');
  });

  it('renders with custom color', () => {
    const { container } = render(<CreateGroupIcon color="#FF0000" />);
    const svg = container.querySelector('svg');
    const paths = svg.querySelectorAll('path');
    
    // Check if any path has the custom color
    let hasCustomColor = false;
    paths.forEach(path => {
      if (path.getAttribute('stroke') === '#FF0000' || path.getAttribute('fill') === '#FF0000') {
        hasCustomColor = true;
      }
    });
    
    expect(hasCustomColor).toBe(true);
  });

  it('applies className prop', () => {
    const { container } = render(<CreateGroupIcon className="custom-class" />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveClass('custom-class');
  });

  it('renders all path elements', () => {
    const { container } = render(<CreateGroupIcon />);
    const svg = container.querySelector('svg');
    const paths = svg.querySelectorAll('path');
    
    expect(paths.length).toBeGreaterThan(0);
  });

  it('renders with namespace attribute', () => {
    const { container } = render(<CreateGroupIcon />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
  });

  it('renders fill="none" by default', () => {
    const { container } = render(<CreateGroupIcon />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveAttribute('fill', 'none');
  });

  it('renders with different color prop values', () => {
    const colors = ['#fff', '#000', '#FF5733', '#00FF00'];
    
    colors.forEach(color => {
      const { container } = render(<CreateGroupIcon color={color} />);
      const paths = container.querySelectorAll('path');
      
      let foundColor = false;
      paths.forEach(path => {
        if (path.getAttribute('stroke') === color || path.getAttribute('fill') === color) {
          foundColor = true;
        }
      });
      
      expect(foundColor).toBe(true);
    });
  });

  it('renders with all prop combinations', () => {
    const { container } = render(
      <CreateGroupIcon 
        width={48} 
        height={48} 
        color="#123456"
        className="test-icon custom-color"
      />
    );
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveAttribute('width', '48');
    expect(svg).toHaveAttribute('height', '48');
    expect(svg).toHaveClass('test-icon');
    expect(svg).toHaveClass('custom-color');
  });
});
