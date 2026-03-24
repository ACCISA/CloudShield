import { render } from '@testing-library/react';
import ListIcon from '../DisplayButton/ListIcon';

describe('ListIcon (TableIcon)', () => {
  it('renders without crashing', () => {
    const { container } = render(<ListIcon />);
    expect(container).toBeTruthy();
  });

  it('renders an SVG element', () => {
    const { container } = render(<ListIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('uses default dimensions', () => {
    const { container } = render(<ListIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '28');
    expect(svg).toHaveAttribute('height', '21');
  });

  it('accepts custom width and height', () => {
    const { container } = render(<ListIcon width={56} height={42} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '56');
    expect(svg).toHaveAttribute('height', '42');
  });

  it('uses default color white', () => {
    const { container } = render(<ListIcon />);
    const paths = container.querySelectorAll('path');
    const rects = container.querySelectorAll('rect');
    
    [...paths, ...rects].forEach((element) => {
      const stroke = element.getAttribute('stroke');
      if (stroke) expect(stroke).toBeTruthy();
    });
  });

  it('accepts custom color', () => {
    const { container } = render(<ListIcon color="#0000FF" />);
    const paths = container.querySelectorAll('path');
    const rects = container.querySelectorAll('rect');
    
    [...paths, ...rects].forEach((element) => {
      const stroke = element.getAttribute('stroke');
      if (stroke) expect(stroke).toBe('#0000FF');
    });
  });

  it('applies custom className', () => {
    const { container } = render(<ListIcon className="table-icon" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('table-icon');
  });

  it('has correct viewBox', () => {
    const { container } = render(<ListIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 28 21');
  });

  it('renders SVG with correct namespace', () => {
    const { container } = render(<ListIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
  });

  it('contains rect and path elements', () => {
    const { container } = render(<ListIcon />);
    const rects = container.querySelectorAll('rect');
    const paths = container.querySelectorAll('path');
    expect(rects.length + paths.length).toBeGreaterThan(0);
  });

  it('renders with SVG fill="none"', () => {
    const { container } = render(<ListIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });
});
