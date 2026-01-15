import { render } from '@testing-library/react';
import EditIcon from '../EditIcon';

describe('EditIcon', () => {
  it('renders without crashing', () => {
    const { container } = render(<EditIcon />);
    expect(container).toBeTruthy();
  });

  it('renders an SVG element', () => {
    const { container } = render(<EditIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('uses default dimensions', () => {
    const { container } = render(<EditIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '15');
    expect(svg).toHaveAttribute('height', '16');
  });

  it('accepts custom width and height', () => {
    const { container } = render(<EditIcon width={20} height={24} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '20');
    expect(svg).toHaveAttribute('height', '24');
  });

  it('uses default color', () => {
    const { container } = render(<EditIcon />);
    const paths = container.querySelectorAll('path');
    expect(paths[0]).toHaveAttribute('stroke', '#BCBCBC');
  });

  it('accepts custom color', () => {
    const { container } = render(<EditIcon color="#000000" />);
    const paths = container.querySelectorAll('path');
    paths.forEach((path) => {
      if (path.getAttribute('stroke')) {
        expect(path.getAttribute('stroke')).toBe('#000000');
      }
      if (path.getAttribute('fill')) {
        expect(path.getAttribute('fill')).toBe('#000000');
      }
    });
  });

  it('applies custom className', () => {
    const { container } = render(<EditIcon className="edit-icon" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('edit-icon');
  });

  it('has correct viewBox', () => {
    const { container } = render(<EditIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 15 16');
  });

  it('renders SVG with correct namespace', () => {
    const { container } = render(<EditIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
  });

  it('contains multiple path elements', () => {
    const { container } = render(<EditIcon />);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThan(1);
  });

  it('renders with SVG fill="none"', () => {
    const { container } = render(<EditIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('fill', 'none');
  });
});
