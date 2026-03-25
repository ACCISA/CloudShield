import { render } from '@testing-library/react';
import ConnectIcon from '../ConnectIcon';

describe('ConnectIcon', () => {
  it('renders without crashing', () => {
    const { container } = render(<ConnectIcon />);
    expect(container).toBeTruthy();
  });

  it('renders an SVG element', () => {
    const { container } = render(<ConnectIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('uses default width and height', () => {
    const { container } = render(<ConnectIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '14');
    expect(svg).toHaveAttribute('height', '14');
  });

  it('accepts custom width and height', () => {
    const { container } = render(<ConnectIcon width={28} height={28} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '28');
    expect(svg).toHaveAttribute('height', '28');
  });

  it('uses default color when not provided', () => {
    const { container } = render(<ConnectIcon />);
    const path = container.querySelector('path');
    expect(path).toBeTruthy();
  });

  it('accepts custom color', () => {
    const { container } = render(<ConnectIcon color="#FF5733" />);
    const path = container.querySelector('path');
    expect(path).toBeTruthy();
  });

  it('has correct viewBox', () => {
    const { container } = render(<ConnectIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 14 14');
  });

  it('contains path element with correct attributes', () => {
    const { container } = render(<ConnectIcon />);
    const path = container.querySelector('path');
    expect(path).toHaveAttribute('fill-rule', 'evenodd');
    expect(path).toHaveAttribute('clip-rule', 'evenodd');
  });

  it('renders correct SVG namespace', () => {
    const { container } = render(<ConnectIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
  });

  it('uses default color white', () => {
    const { container } = render(<ConnectIcon />);
    const svg = container.querySelector('svg');
    expect(svg.getAttribute('fill')).toBe('none');
  });
});
