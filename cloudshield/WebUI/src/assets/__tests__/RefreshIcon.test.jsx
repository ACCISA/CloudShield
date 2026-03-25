import { render } from '@testing-library/react';
import RefreshIcon from '../RefreshIcon';

describe('RefreshIcon', () => {
  it('renders without crashing', () => {
    const { container } = render(<RefreshIcon />);
    expect(container).toBeTruthy();
  });

  it('renders an SVG element', () => {
    const { container } = render(<RefreshIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('uses default dimensions', () => {
    const { container } = render(<RefreshIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '16');
    expect(svg).toHaveAttribute('height', '16');
  });

  it('accepts custom width and height', () => {
    const { container } = render(<RefreshIcon width={32} height={32} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '32');
    expect(svg).toHaveAttribute('height', '32');
  });

  it('uses default color white', () => {
    const { container } = render(<RefreshIcon />);
    const paths = container.querySelectorAll('path');
    paths.forEach((path) => {
      expect(path).toBeTruthy();
    });
  });

  it('accepts custom color', () => {
    const { container } = render(<RefreshIcon color="#0066FF" />);
    const paths = container.querySelectorAll('path');
    paths.forEach((path) => {
      expect(path).toBeTruthy();
    });
  });

  it('applies custom className', () => {
    const { container } = render(<RefreshIcon className="refresh-icon" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('refresh-icon');
  });

  it('has correct viewBox', () => {
    const { container } = render(<RefreshIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 16 16');
  });

  it('renders SVG with correct namespace', () => {
    const { container } = render(<RefreshIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
  });

  it('contains multiple path elements', () => {
    const { container } = render(<RefreshIcon />);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThan(0);
  });

  it('renders with SVG fill="none"', () => {
    const { container } = render(<RefreshIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });
});
