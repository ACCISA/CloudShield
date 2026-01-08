import { render } from '@testing-library/react';
import DashboardIcon from '../../NavBar/DashboardIcon';

describe('DashboardIcon', () => {
  it('renders without crashing', () => {
    const { container } = render(<DashboardIcon />);
    expect(container).toBeTruthy();
  });

  it('renders an SVG element', () => {
    const { container } = render(<DashboardIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('uses default dimensions', () => {
    const { container } = render(<DashboardIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '12');
    expect(svg).toHaveAttribute('height', '13');
  });

  it('accepts custom width and height', () => {
    const { container } = render(<DashboardIcon width={24} height={26} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '26');
  });

  it('has correct viewBox', () => {
    const { container } = render(<DashboardIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 12 13');
  });

  it('renders SVG with correct namespace', () => {
    const { container } = render(<DashboardIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
  });

  it('contains multiple path elements', () => {
    const { container } = render(<DashboardIcon />);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThan(0);
  });

  it('applies selected color when selected prop is true', () => {
    const { container } = render(<DashboardIcon selected={true} />);
    const paths = container.querySelectorAll('path');
    paths.forEach((path) => {
      const fill = path.getAttribute('fill');
      if (fill) expect(fill).toBe('#fff');
    });
  });

  it('applies unselected color when selected prop is false', () => {
    const { container } = render(<DashboardIcon selected={false} />);
    const paths = container.querySelectorAll('path');
    paths.forEach((path) => {
      const stroke = path.getAttribute('stroke');
      if (stroke) expect(stroke).toBe('#BCBCBC');
    });
  });

  it('has fillOpacity 1 when selected', () => {
    const { container } = render(<DashboardIcon selected={true} />);
    const paths = container.querySelectorAll('path');
    paths.forEach((path) => {
      const fillOpacity = path.getAttribute('fillOpacity');
      if (fillOpacity) expect(fillOpacity).toBe('1');
    });
  });

  it('has fillOpacity 0 when not selected', () => {
    const { container } = render(<DashboardIcon selected={false} />);
    const paths = container.querySelectorAll('path');
    paths.forEach((path) => {
      const fillOpacity = path.getAttribute('fillOpacity');
      if (fillOpacity) expect(fillOpacity).toBe('0');
    });
  });

  it('applies custom className', () => {
    const { container } = render(<DashboardIcon className="dashboard-icon" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('dashboard-icon');
  });

  it('renders with SVG fill="none"', () => {
    const { container } = render(<DashboardIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('fill', 'none');
  });
});
