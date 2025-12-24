import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import ImageIcon from '../ImageIcon';

describe('ImageIcon (GridIcon)', () => {
  it('renders without crashing', () => {
    const { container } = render(<ImageIcon />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders with default props', () => {
    const { container } = render(<ImageIcon />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveAttribute('width', '32');
    expect(svg).toHaveAttribute('height', '32');
    expect(svg).toHaveAttribute('viewBox', '0 0 32 32');
  });

  it('renders with custom width and height', () => {
    const { container } = render(<ImageIcon width={48} height={48} />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveAttribute('width', '48');
    expect(svg).toHaveAttribute('height', '48');
  });

  it('renders with custom color', () => {
    const { container } = render(<ImageIcon color="#0000FF" />);
    const svg = container.querySelector('svg');
    const path = svg.querySelector('path');
    
    expect(path).toHaveAttribute('stroke', '#0000FF');
  });

  it('renders with default color #2E2E2E', () => {
    const { container } = render(<ImageIcon />);
    const svg = container.querySelector('svg');
    const path = svg.querySelector('path');
    
    expect(path).toHaveAttribute('stroke', '#2E2E2E');
  });

  it('applies className prop', () => {
    const { container } = render(<ImageIcon className="grid-view" />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveClass('grid-view');
  });

  it('renders single path element', () => {
    const { container } = render(<ImageIcon />);
    const svg = container.querySelector('svg');
    const paths = svg.querySelectorAll('path');
    
    expect(paths.length).toBe(1);
  });

  it('renders with correct viewBox', () => {
    const { container } = render(<ImageIcon />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveAttribute('viewBox', '0 0 32 32');
  });

  it('renders with fill="none"', () => {
    const { container } = render(<ImageIcon />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveAttribute('fill', 'none');
  });

  it('renders path with strokeLinecap="round"', () => {
    const { container } = render(<ImageIcon />);
    const path = container.querySelector('path');
    
    expect(path).toHaveAttribute('strokeLinecap', 'round');
  });

  it('renders path with strokeLinejoin="round"', () => {
    const { container } = render(<ImageIcon />);
    const path = container.querySelector('path');
    
    expect(path).toHaveAttribute('strokeLinejoin', 'round');
  });

  it('renders with xmlns attribute', () => {
    const { container } = render(<ImageIcon />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
  });

  it('renders with large size', () => {
    const { container } = render(<ImageIcon width={64} height={64} />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveAttribute('width', '64');
    expect(svg).toHaveAttribute('height', '64');
  });

  it('renders with different colors', () => {
    const colors = ['#FFFFFF', '#000000', '#FF0000', '#00FF00'];
    
    colors.forEach(color => {
      const { container } = render(<ImageIcon color={color} />);
      const path = container.querySelector('path');
      
      expect(path).toHaveAttribute('stroke', color);
    });
  });

  it('renders with combined props', () => {
    const { container } = render(
      <ImageIcon 
        width={56} 
        height={56} 
        color="#333333"
        className="large-grid dark-theme"
      />
    );
    const svg = container.querySelector('svg');
    const path = svg.querySelector('path');
    
    expect(svg).toHaveAttribute('width', '56');
    expect(svg).toHaveAttribute('height', '56');
    expect(svg).toHaveClass('large-grid');
    expect(svg).toHaveClass('dark-theme');
    expect(path).toHaveAttribute('stroke', '#333333');
  });

  it('renders with square dimensions', () => {
    const { container } = render(<ImageIcon width={40} height={40} />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveAttribute('width', '40');
    expect(svg).toHaveAttribute('height', '40');
  });
});
