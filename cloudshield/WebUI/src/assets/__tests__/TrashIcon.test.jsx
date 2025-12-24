import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import TrashIcon from '../TrashIcon';

describe('TrashIcon', () => {
  it('renders without crashing', () => {
    const { container } = render(<TrashIcon />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders with default props', () => {
    const { container } = render(<TrashIcon />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveAttribute('width', '12');
    expect(svg).toHaveAttribute('height', '14');
  });

  it('renders with custom width and height', () => {
    const { container } = render(<TrashIcon width={16} height={20} />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveAttribute('width', '16');
    expect(svg).toHaveAttribute('height', '20');
  });

  it('renders with custom color', () => {
    const { container } = render(<TrashIcon color="#FF0000" />);
    const svg = container.querySelector('svg');
    const paths = svg.querySelectorAll('path');
    
    let hasCustomColor = false;
    paths.forEach(path => {
      if (path.getAttribute('fill') === '#FF0000') {
        hasCustomColor = true;
      }
    });
    
    expect(hasCustomColor).toBe(true);
  });

  it('renders with default color #D51616', () => {
    const { container } = render(<TrashIcon />);
    const svg = container.querySelector('svg');
    const paths = svg.querySelectorAll('path');
    
    let hasDefaultColor = false;
    paths.forEach(path => {
      if (path.getAttribute('fill') === '#D51616') {
        hasDefaultColor = true;
      }
    });
    
    expect(hasDefaultColor).toBe(true);
  });

  it('applies className prop', () => {
    const { container } = render(<TrashIcon className="delete-icon" />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveClass('delete-icon');
  });

  it('renders correct viewBox', () => {
    const { container } = render(<TrashIcon />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveAttribute('viewBox', '0 0 12 14');
  });

  it('renders with fill="none"', () => {
    const { container } = render(<TrashIcon />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveAttribute('fill', 'none');
  });

  it('renders multiple path elements', () => {
    const { container } = render(<TrashIcon />);
    const svg = container.querySelector('svg');
    const paths = svg.querySelectorAll('path');
    
    // TrashIcon has 2 paths
    expect(paths.length).toBe(2);
  });

  it('renders with xmlns attribute', () => {
    const { container } = render(<TrashIcon />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
  });

  it('renders paths with fill attributes', () => {
    const { container } = render(<TrashIcon />);
    const paths = container.querySelectorAll('path');
    
    let filledPathCount = 0;
    paths.forEach(path => {
      if (path.getAttribute('fill')) {
        filledPathCount++;
      }
    });
    
    expect(filledPathCount).toBeGreaterThan(0);
  });

  it('renders with different large sizes', () => {
    const { container } = render(<TrashIcon width={24} height={28} />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '28');
  });

  it('renders with all props combined', () => {
    const { container } = render(
      <TrashIcon 
        width={18} 
        height={21} 
        color="#000000"
        className="trash-bin error-icon"
      />
    );
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveAttribute('width', '18');
    expect(svg).toHaveAttribute('height', '21');
    expect(svg).toHaveClass('trash-bin');
    expect(svg).toHaveClass('error-icon');
  });
});
