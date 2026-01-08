import { render } from '@testing-library/react';
import TrashIcon from '../TrashIcon';

describe('TrashIcon', () => {
  it('renders without crashing', () => {
    const { container } = render(<TrashIcon />);
    expect(container).toBeTruthy();
  });

  it('renders an SVG element', () => {
    const { container } = render(<TrashIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('uses default dimensions', () => {
    const { container } = render(<TrashIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '12');
    expect(svg).toHaveAttribute('height', '14');
  });

  it('accepts custom width and height', () => {
    const { container } = render(<TrashIcon width={24} height={28} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '28');
  });

  it('uses default color red', () => {
    const { container } = render(<TrashIcon />);
    const paths = container.querySelectorAll('path');
    paths.forEach((path) => {
      expect(path).toHaveAttribute('fill', '#D51616');
    });
  });

  it('accepts custom color', () => {
    const { container } = render(<TrashIcon color="#FF0000" />);
    const paths = container.querySelectorAll('path');
    paths.forEach((path) => {
      expect(path).toHaveAttribute('fill', '#FF0000');
    });
  });

  it('applies custom className', () => {
    const { container } = render(<TrashIcon className="trash-icon" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('trash-icon');
  });

  it('has correct viewBox', () => {
    const { container } = render(<TrashIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 12 14');
  });

  it('renders SVG with correct namespace', () => {
    const { container } = render(<TrashIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
  });

  it('contains multiple path elements', () => {
    const { container } = render(<TrashIcon />);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThan(1);
  });

  it('renders with SVG fill="none"', () => {
    const { container } = render(<TrashIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('fill', 'none');
  });
});
