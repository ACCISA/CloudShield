import { render } from '@testing-library/react';
import DisplayIcon from '../../DisplayButton/DisplayIcon';

describe('DisplayIcon (SlidersIcon)', () => {
  it('renders without crashing', () => {
    const { container } = render(<DisplayIcon />);
    expect(container).toBeTruthy();
  });

  it('renders an SVG element', () => {
    const { container } = render(<DisplayIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('uses default dimensions', () => {
    const { container } = render(<DisplayIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '12');
    expect(svg).toHaveAttribute('height', '12');
  });

  it('accepts custom width and height', () => {
    const { container } = render(<DisplayIcon width={24} height={24} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '24');
  });

  it('uses default color white', () => {
    const { container } = render(<DisplayIcon />);
    const paths = container.querySelectorAll('path');
    paths.forEach((path) => {
      expect(path).toHaveAttribute('stroke', 'white');
    });
  });

  it('accepts custom color', () => {
    const { container } = render(<DisplayIcon color="#000000" />);
    const paths = container.querySelectorAll('path');
    paths.forEach((path) => {
      expect(path).toHaveAttribute('stroke', '#000000');
    });
  });

  it('applies custom className', () => {
    const { container } = render(<DisplayIcon className="sliders-icon" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('sliders-icon');
  });

  it('has correct viewBox', () => {
    const { container } = render(<DisplayIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 12 12');
  });

  it('renders SVG with correct namespace', () => {
    const { container } = render(<DisplayIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
  });

  it('contains multiple path elements', () => {
    const { container } = render(<DisplayIcon />);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThan(0);
  });

  it('renders with SVG fill="none"', () => {
    const { container } = render(<DisplayIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('fill', 'none');
  });
});
