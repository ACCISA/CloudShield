import { render } from '@testing-library/react';
import CreateWorkstationIcon from '../CreateWorkstationIcon';

describe('CreateWorkstationIcon (MonitorIcon)', () => {
  it('renders without crashing', () => {
    const { container } = render(<CreateWorkstationIcon />);
    expect(container).toBeTruthy();
  });

  it('renders an SVG element', () => {
    const { container } = render(<CreateWorkstationIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('uses default dimensions', () => {
    const { container } = render(<CreateWorkstationIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '16');
    expect(svg).toHaveAttribute('height', '16');
  });

  it('accepts custom width and height', () => {
    const { container } = render(
      <CreateWorkstationIcon width={32} height={32} />
    );
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '32');
    expect(svg).toHaveAttribute('height', '32');
  });

  it('uses default color white', () => {
    const { container } = render(<CreateWorkstationIcon />);
    const paths = container.querySelectorAll('path');
    paths.forEach((path) => {
      const stroke = path.getAttribute('stroke');
      if (stroke) expect(stroke).toBe('white');
    });
  });

  it('accepts custom color', () => {
    const { container } = render(<CreateWorkstationIcon color="#00AA00" />);
    const paths = container.querySelectorAll('path');
    paths.forEach((path) => {
      const stroke = path.getAttribute('stroke');
      if (stroke) expect(stroke).toBe('#00AA00');
    });
  });

  it('applies custom className', () => {
    const { container } = render(
      <CreateWorkstationIcon className="monitor-icon" />
    );
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('monitor-icon');
  });

  it('has correct viewBox', () => {
    const { container } = render(<CreateWorkstationIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 13 13');
  });

  it('renders SVG with correct namespace', () => {
    const { container } = render(<CreateWorkstationIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
  });

  it('contains multiple path elements', () => {
    const { container } = render(<CreateWorkstationIcon />);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThan(0);
  });
});
