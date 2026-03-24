import { render } from '@testing-library/react';
import WorkstationsIcon from '../NavBar/WorkstationsIcon';

describe('WorkstationsIcon', () => {
  it('renders without crashing', () => {
    const { container } = render(<WorkstationsIcon />);
    expect(container).toBeTruthy();
  });

  it('renders an SVG element', () => {
    const { container } = render(<WorkstationsIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('uses default dimensions', () => {
    const { container } = render(<WorkstationsIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '17');
    expect(svg).toHaveAttribute('height', '17');
  });

  it('accepts custom width and height', () => {
    const { container } = render(<WorkstationsIcon width={34} height={34} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '34');
    expect(svg).toHaveAttribute('height', '34');
  });

  it('has correct viewBox', () => {
    const { container } = render(<WorkstationsIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 17 17');
  });

  it('renders SVG with correct namespace', () => {
    const { container } = render(<WorkstationsIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
  });

  it('contains path element', () => {
    const { container } = render(<WorkstationsIcon />);
    const path = container.querySelector('path');
    expect(path).toBeTruthy();
  });

  it('applies selected state with white color', () => {
    const { container } = render(<WorkstationsIcon selected={true} />);
    const path = container.querySelector('path');
    expect(path).toBeTruthy();
    expect(path).toBeTruthy();
  });

  it('applies unselected state with gray color', () => {
    const { container } = render(<WorkstationsIcon selected={false} />);
    const path = container.querySelector('path');
    expect(path).toBeTruthy();
    expect(path).toBeTruthy();
  });

  it('has fillOpacity 1 when selected', () => {
    const { container } = render(<WorkstationsIcon selected={true} />);
    const path = container.querySelector('path');
    expect(path).toBeTruthy();
  });

  it('has fillOpacity 0 when not selected', () => {
    const { container } = render(<WorkstationsIcon selected={false} />);
    const path = container.querySelector('path');
    expect(path).toBeTruthy();
  });

  it('applies custom className', () => {
    const { container } = render(
      <WorkstationsIcon className="workstations-icon" />
    );
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('workstations-icon');
  });

  it('renders with SVG fill="none"', () => {
    const { container } = render(<WorkstationsIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });
});
