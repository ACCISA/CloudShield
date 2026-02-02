import { render } from '@testing-library/react';
import FolderPlusIcon from '../FolderPlusIcon';

describe('FolderPlusIcon', () => {
  it('renders without crashing', () => {
    const { container } = render(<FolderPlusIcon />);
    expect(container).toBeTruthy();
  });

  it('renders an SVG element', () => {
    const { container } = render(<FolderPlusIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('uses default dimensions', () => {
    const { container } = render(<FolderPlusIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '16');
    expect(svg).toHaveAttribute('height', '16');
  });

  it('accepts custom width and height', () => {
    const { container } = render(<FolderPlusIcon width={32} height={32} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '32');
    expect(svg).toHaveAttribute('height', '32');
  });

  it('uses default color white', () => {
    const { container } = render(<FolderPlusIcon />);
    const path = container.querySelector('path');
    expect(path).toBeTruthy();
    const stroke = path.getAttribute('stroke');
    expect(stroke).toBe('white');
  });

  it('accepts custom color', () => {
    const { container } = render(<FolderPlusIcon color="#0099FF" />);
    const path = container.querySelector('path');
    const stroke = path.getAttribute('stroke');
    expect(stroke).toBe('#0099FF');
  });

  it('applies custom className', () => {
    const { container } = render(<FolderPlusIcon className="folder-icon" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('folder-icon');
  });

  it('has correct viewBox', () => {
    const { container } = render(<FolderPlusIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
  });

  it('renders SVG with correct namespace', () => {
    const { container } = render(<FolderPlusIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
  });

  it('contains path element', () => {
    const { container } = render(<FolderPlusIcon />);
    const path = container.querySelector('path');
    expect(path).toBeTruthy();
  });

  it('path has correct stroke properties', () => {
    const { container } = render(<FolderPlusIcon />);
    const path = container.querySelector('path');
    expect(path).toHaveAttribute('stroke-width', '2');
    expect(path).toHaveAttribute('stroke-linecap', 'round');
    expect(path).toHaveAttribute('stroke-linejoin', 'round');
  });

  it('path has fill set to none', () => {
    const { container } = render(<FolderPlusIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('fill', 'none');
  });
});
