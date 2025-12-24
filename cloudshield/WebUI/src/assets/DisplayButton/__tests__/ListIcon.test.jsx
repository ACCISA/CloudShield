import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import ListIcon from '../ListIcon';

describe('ListIcon (TableIcon)', () => {
  it('renders without crashing', () => {
    const { container } = render(<ListIcon />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders with default props', () => {
    const { container } = render(<ListIcon />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveAttribute('width', '28');
    expect(svg).toHaveAttribute('height', '21');
    expect(svg).toHaveAttribute('viewBox', '0 0 28 21');
  });

  it('renders with custom width and height', () => {
    const { container } = render(<ListIcon width={35} height={28} />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveAttribute('width', '35');
    expect(svg).toHaveAttribute('height', '28');
  });

  it('renders with custom color', () => {
    const { container } = render(<ListIcon color="#FF0000" />);
    const svg = container.querySelector('svg');
    const elements = svg.querySelectorAll('rect, path');
    
    let hasCustomColor = false;
    elements.forEach(el => {
      if (el.getAttribute('stroke') === '#FF0000') {
        hasCustomColor = true;
      }
    });
    
    expect(hasCustomColor).toBe(true);
  });

  it('renders with default color white', () => {
    const { container } = render(<ListIcon />);
    const svg = container.querySelector('svg');
    const rect = svg.querySelector('rect');
    
    expect(rect).toHaveAttribute('stroke', 'white');
  });

  it('applies className prop', () => {
    const { container } = render(<ListIcon className="list-view" />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveClass('list-view');
  });

  it('renders with correct viewBox', () => {
    const { container } = render(<ListIcon />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveAttribute('viewBox', '0 0 28 21');
  });

  it('renders with fill="none"', () => {
    const { container } = render(<ListIcon />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveAttribute('fill', 'none');
  });

  it('renders rect element', () => {
    const { container } = render(<ListIcon />);
    const svg = container.querySelector('svg');
    const rect = svg.querySelector('rect');
    
    expect(rect).toBeInTheDocument();
  });

  it('renders path elements', () => {
    const { container } = render(<ListIcon />);
    const svg = container.querySelector('svg');
    const paths = svg.querySelectorAll('path');
    
    // ListIcon should have 2 path elements for the horizontal lines
    expect(paths.length).toBe(2);
  });

  it('renders with xmlns attribute', () => {
    const { container } = render(<ListIcon />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
  });

  it('rect has correct position attributes', () => {
    const { container } = render(<ListIcon />);
    const rect = container.querySelector('rect');
    
    expect(rect).toHaveAttribute('x', '0.5');
    expect(rect).toHaveAttribute('y', '0.5');
  });

  it('rect has rx (border radius)', () => {
    const { container } = render(<ListIcon />);
    const rect = container.querySelector('rect');
    
    expect(rect).toHaveAttribute('rx', '1.5');
  });

  it('renders with different sizes', () => {
    const sizes = [
      { width: 28, height: 21 },
      { width: 40, height: 30 },
      { width: 56, height: 42 },
    ];
    
    sizes.forEach(({ width, height }) => {
      const { container } = render(<ListIcon width={width} height={height} />);
      const svg = container.querySelector('svg');
      
      expect(svg).toHaveAttribute('width', width.toString());
      expect(svg).toHaveAttribute('height', height.toString());
    });
  });

  it('renders with combined props', () => {
    const { container } = render(
      <ListIcon 
        width={42} 
        height={32} 
        color="#00FF00"
        className="large-list green-theme"
      />
    );
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveAttribute('width', '42');
    expect(svg).toHaveAttribute('height', '32');
    expect(svg).toHaveClass('large-list');
    expect(svg).toHaveClass('green-theme');
  });

  it('renders with all strokes colored', () => {
    const color = '#0000FF';
    const { container } = render(<ListIcon color={color} />);
    const svg = container.querySelector('svg');
    const elements = svg.querySelectorAll('rect, path');
    
    let allHaveColor = true;
    elements.forEach(el => {
      if (el.getAttribute('stroke') !== color) {
        allHaveColor = false;
      }
    });
    
    expect(allHaveColor).toBe(true);
  });
});
