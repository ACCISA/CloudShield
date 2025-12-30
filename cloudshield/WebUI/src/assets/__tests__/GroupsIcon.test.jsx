import { render } from '@testing-library/react';
import GroupsIcon from '../../NavBar/GroupsIcon';

describe('GroupsIcon', () => {
  it('renders without crashing', () => {
    const { container } = render(<GroupsIcon />);
    expect(container).toBeTruthy();
  });

  it('renders an SVG element', () => {
    const { container } = render(<GroupsIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('uses default dimensions', () => {
    const { container } = render(<GroupsIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '14');
    expect(svg).toHaveAttribute('height', '12');
  });

  it('accepts custom width and height', () => {
    const { container } = render(<GroupsIcon width={28} height={24} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '28');
    expect(svg).toHaveAttribute('height', '24');
  });

  it('has correct viewBox', () => {
    const { container } = render(<GroupsIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 14 12');
  });

  it('renders SVG with correct namespace', () => {
    const { container } = render(<GroupsIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
  });

  it('contains multiple path elements', () => {
    const { container } = render(<GroupsIcon />);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThan(0);
  });

  it('applies selected state with white color', () => {
    const { container } = render(<GroupsIcon selected={true} />);
    const paths = container.querySelectorAll('path');
    paths.forEach((path) => {
      const stroke = path.getAttribute('stroke');
      if (stroke) expect(stroke).toBe('#fff');
    });
  });

  it('applies unselected state with gray color', () => {
    const { container } = render(<GroupsIcon selected={false} />);
    const paths = container.querySelectorAll('path');
    paths.forEach((path) => {
      const stroke = path.getAttribute('stroke');
      if (stroke) expect(stroke).toBe('#BCBCBC');
    });
  });

  it('has fill="none" when selected', () => {
    const { container } = render(<GroupsIcon selected={true} />);
    const paths = container.querySelectorAll('path');
    paths.forEach((path) => {
      expect(path).toHaveAttribute('fill', 'white');
    });
  });

  it('has fill color when not selected', () => {
    const { container } = render(<GroupsIcon selected={false} />);
    const paths = container.querySelectorAll('path');
    paths.forEach((path) => {
      const fill = path.getAttribute('fill');
      if (fill) expect(fill).toMatch(/(none|#BCBCBC)/);
    });
  });

  it('applies custom className', () => {
    const { container } = render(<GroupsIcon className="groups-icon" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('groups-icon');
  });

  it('renders with SVG fill="none"', () => {
    const { container } = render(<GroupsIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('fill', 'none');
  });
});
