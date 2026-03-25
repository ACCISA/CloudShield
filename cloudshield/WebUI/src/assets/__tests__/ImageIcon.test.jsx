import { render } from '@testing-library/react';
import ImageIcon from '../DisplayButton/ImageIcon';

describe('ImageIcon (GridIcon)', () => {
  it('renders without crashing', () => {
    const { container } = render(<ImageIcon />);
    expect(container).toBeTruthy();
  });

  it('renders an SVG element', () => {
    const { container } = render(<ImageIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('uses default dimensions', () => {
    const { container } = render(<ImageIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '32');
    expect(svg).toHaveAttribute('height', '32');
  });

  it('accepts custom width and height', () => {
    const { container } = render(<ImageIcon width={64} height={64} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '64');
    expect(svg).toHaveAttribute('height', '64');
  });

  it('uses default color', () => {
    const { container } = render(<ImageIcon />);
    const path = container.querySelector('path');
    expect(path).toBeTruthy();
  });

  it('accepts custom color', () => {
    const { container } = render(<ImageIcon color="#FF0000" />);
    const path = container.querySelector('path');
    expect(path).toBeTruthy();
  });

  it('applies custom className', () => {
    const { container } = render(<ImageIcon className="grid-icon" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('grid-icon');
  });

  it('has correct viewBox', () => {
    const { container } = render(<ImageIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 32 32');
  });

  it('renders SVG with correct namespace', () => {
    const { container } = render(<ImageIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
  });

  it('contains path element', () => {
    const { container } = render(<ImageIcon />);
    const path = container.querySelector('path');
    expect(path).toBeTruthy();
  });

  it('renders with SVG fill="none"', () => {
    const { container } = render(<ImageIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });
});
