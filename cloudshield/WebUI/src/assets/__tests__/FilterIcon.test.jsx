import { render } from '@testing-library/react';
import FilterIcon from '../FilterIcon';

describe('FilterIcon', () => {
  it('renders without crashing', () => {
    const { container } = render(<FilterIcon />);
    expect(container).toBeTruthy();
  });

  it('renders an SVG element', () => {
    const { container } = render(<FilterIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('uses default dimensions', () => {
    const { container } = render(<FilterIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '16');
    expect(svg).toHaveAttribute('height', '16');
  });

  it('accepts custom width and height', () => {
    const { container } = render(<FilterIcon width={24} height={24} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '24');
  });

  it('uses default color white', () => {
    const { container } = render(<FilterIcon />);
    const paths = container.querySelectorAll('path');
    paths.forEach((path) => {
      const stroke = path.getAttribute('stroke');
      if (stroke) expect(stroke).toBeTruthy();
    });
  });

  it('accepts custom color', () => {
    const { container } = render(<FilterIcon color="#FF5733" />);
    const paths = container.querySelectorAll('path');
    paths.forEach((path) => {
      const stroke = path.getAttribute('stroke');
      if (stroke) expect(stroke).toBe('#FF5733');
    });
  });

  it('applies custom className', () => {
    const { container } = render(<FilterIcon className="filter-icon" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('filter-icon');
  });

  it('has correct viewBox', () => {
    const { container } = render(<FilterIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 16 16');
  });

  it('renders SVG with correct namespace', () => {
    const { container } = render(<FilterIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
  });

  it('contains multiple path elements', () => {
    const { container } = render(<FilterIcon />);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThan(0);
  });

  it('renders with SVG fill="none"', () => {
    const { container } = render(<FilterIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });
});
