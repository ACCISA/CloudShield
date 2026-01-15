import { render } from '@testing-library/react';
import FilesIcon from '../../NavBar/FilesIcon';

describe('FilesIcon', () => {
  it('renders without crashing', () => {
    const { container } = render(<FilesIcon />);
    expect(container).toBeTruthy();
  });

  it('renders an SVG element', () => {
    const { container } = render(<FilesIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('uses default dimensions', () => {
    const { container } = render(<FilesIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '11');
    expect(svg).toHaveAttribute('height', '13');
  });

  it('accepts custom width and height', () => {
    const { container } = render(<FilesIcon width={22} height={26} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '22');
    expect(svg).toHaveAttribute('height', '26');
  });

  it('has correct viewBox', () => {
    const { container } = render(<FilesIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 11 13');
  });

  it('renders SVG with correct namespace', () => {
    const { container } = render(<FilesIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
  });

  it('contains multiple path elements', () => {
    const { container } = render(<FilesIcon />);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThan(0);
  });

  it('applies selected state with correct fillOpacity', () => {
    const { container } = render(<FilesIcon selected={true} />);
    const firstPath = container.querySelector('path');
    expect(firstPath).toHaveAttribute('fillOpacity', '1');
  });

  it('applies unselected state with correct fillOpacity', () => {
    const { container } = render(<FilesIcon selected={false} />);
    const firstPath = container.querySelector('path');
    expect(firstPath).toHaveAttribute('fillOpacity', '0.2');
  });

  it('uses white color when selected', () => {
    const { container } = render(<FilesIcon selected={true} />);
    const paths = container.querySelectorAll('path');
    paths.forEach((path) => {
      const fill = path.getAttribute('fill');
      if (fill) expect(fill).toBe('#fff');
    });
  });

  it('uses gray color when not selected', () => {
    const { container } = render(<FilesIcon selected={false} />);
    const paths = container.querySelectorAll('path');
    paths.forEach((path) => {
      const fill = path.getAttribute('fill');
      if (fill) expect(fill).toBe('#BCBCBC');
    });
  });

  it('applies custom className', () => {
    const { container } = render(<FilesIcon className="files-icon" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('files-icon');
  });

  it('renders with SVG fill="none"', () => {
    const { container } = render(<FilesIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('fill', 'none');
  });
});
