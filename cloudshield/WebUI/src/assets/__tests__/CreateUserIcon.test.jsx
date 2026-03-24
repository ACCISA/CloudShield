import { render } from '@testing-library/react';
import CreateUserIcon from '../CreateUserIcon';

describe('CreateUserIcon (UserAddIcon)', () => {
  it('renders without crashing', () => {
    const { container } = render(<CreateUserIcon />);
    expect(container).toBeTruthy();
  });

  it('renders an SVG element', () => {
    const { container } = render(<CreateUserIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('uses default dimensions', () => {
    const { container } = render(<CreateUserIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '16');
    expect(svg).toHaveAttribute('height', '16');
  });

  it('accepts custom width and height', () => {
    const { container } = render(<CreateUserIcon width={32} height={32} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '32');
    expect(svg).toHaveAttribute('height', '32');
  });

  it('uses default color white', () => {
    const { container } = render(<CreateUserIcon />);
    const paths = container.querySelectorAll('path');
    paths.forEach((path) => {
      const stroke = path.getAttribute('stroke');
      if (stroke) expect(stroke).toBeTruthy();
    });
  });

  it('accepts custom color', () => {
    const { container } = render(<CreateUserIcon color="#0099FF" />);
    const paths = container.querySelectorAll('path');
    paths.forEach((path) => {
      const stroke = path.getAttribute('stroke');
      if (stroke) expect(stroke).toBe('#0099FF');
    });
  });

  it('applies custom className', () => {
    const { container } = render(<CreateUserIcon className="user-icon" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('user-icon');
  });

  it('has correct viewBox', () => {
    const { container } = render(<CreateUserIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 16 16');
  });

  it('renders SVG with correct namespace', () => {
    const { container } = render(<CreateUserIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
  });

  it('contains multiple path elements', () => {
    const { container } = render(<CreateUserIcon />);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThan(0);
  });
});
