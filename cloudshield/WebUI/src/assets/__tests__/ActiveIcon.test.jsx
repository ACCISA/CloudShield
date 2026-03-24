import { render } from '@testing-library/react';
import StatusDotIcon from '../ActiveIcon';

describe('StatusDotIcon', () => {
  it('renders without crashing', () => {
    const { container } = render(<StatusDotIcon />);
    expect(container).toBeTruthy();
  });

  it('renders an SVG element', () => {
    const { container } = render(<StatusDotIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('uses default width and height', () => {
    const { container } = render(<StatusDotIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '12');
    expect(svg).toHaveAttribute('height', '12');
  });

  it('accepts custom width and height', () => {
    const { container } = render(<StatusDotIcon width={24} height={24} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '24');
  });

  it('uses default colors when not provided', () => {
    const { container } = render(<StatusDotIcon />);
    const circles = container.querySelectorAll('circle');
    expect(circles[0]).toBeTruthy();
    expect(circles[1]).toBeTruthy();
  });

  it('accepts custom colors', () => {
    const { container } = render(
      <StatusDotIcon outerColor="#FF0000" innerColor="#00FF00" />
    );
    const circles = container.querySelectorAll('circle');
    expect(circles[0]).toBeTruthy();
    expect(circles[1]).toBeTruthy();
  });

  it('applies custom className', () => {
    const { container } = render(<StatusDotIcon className="custom-class" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('custom-class');
  });

  it('renders two circles with correct positions', () => {
    const { container } = render(<StatusDotIcon />);
    const circles = container.querySelectorAll('circle');
    expect(circles).toHaveLength(2);
    expect(circles[0]).toHaveAttribute('cx', '6');
    expect(circles[0]).toHaveAttribute('cy', '6');
    expect(circles[1]).toHaveAttribute('cx', '6');
    expect(circles[1]).toHaveAttribute('cy', '6');
  });

  it('renders correct SVG namespace', () => {
    const { container } = render(<StatusDotIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
  });
});
