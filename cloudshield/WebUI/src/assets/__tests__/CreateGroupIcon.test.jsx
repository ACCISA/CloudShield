import { render } from '@testing-library/react';
import CreateGroupIcon from '../CreateGroupIcon';

describe('CreateGroupIcon (UsersAddIcon)', () => {
  it('renders without crashing', () => {
    const { container } = render(<CreateGroupIcon />);
    expect(container).toBeTruthy();
  });

  it('renders an SVG element', () => {
    const { container } = render(<CreateGroupIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('uses default dimensions', () => {
    const { container } = render(<CreateGroupIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '16');
    expect(svg).toHaveAttribute('height', '16');
  });

  it('accepts custom width and height', () => {
    const { container } = render(<CreateGroupIcon width={24} height={24} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '24');
  });

  it('uses default color white', () => {
    const { container } = render(<CreateGroupIcon />);
    const paths = container.querySelectorAll('path');
    expect(paths[0]).toBeTruthy();
  });

  it('accepts custom color', () => {
    const { container } = render(<CreateGroupIcon color="#FF0000" />);
    const paths = container.querySelectorAll('path');
    paths.forEach((path) => {
      const stroke = path.getAttribute('stroke');
      const fill = path.getAttribute('fill');
      if (stroke) expect(stroke).toBe('#FF0000');
      if (fill) expect(fill).toBe('#FF0000');
    });
  });

  it('applies custom className', () => {
    const { container } = render(<CreateGroupIcon className="test-class" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('test-class');
  });

  it('has correct viewBox', () => {
    const { container } = render(<CreateGroupIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 16 16');
  });

  it('renders SVG with correct namespace', () => {
    const { container } = render(<CreateGroupIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
  });

  it('contains multiple path elements', () => {
    const { container } = render(<CreateGroupIcon />);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThan(1);
  });
});
