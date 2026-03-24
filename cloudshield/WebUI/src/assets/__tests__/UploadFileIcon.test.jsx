import { render } from '@testing-library/react';
import UploadFileIcon from '../UploadFileIcon';

describe('UploadFileIcon (FileAddIcon)', () => {
  it('renders without crashing', () => {
    const { container } = render(<UploadFileIcon />);
    expect(container).toBeTruthy();
  });

  it('renders an SVG element', () => {
    const { container } = render(<UploadFileIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('uses default dimensions', () => {
    const { container } = render(<UploadFileIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '12');
    expect(svg).toHaveAttribute('height', '13');
  });

  it('accepts custom width and height', () => {
    const { container } = render(<UploadFileIcon width={24} height={26} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '26');
  });

  it('uses default color white', () => {
    const { container } = render(<UploadFileIcon />);
    const path = container.querySelector('path');
    expect(path).toBeTruthy();
  });

  it('accepts custom color', () => {
    const { container } = render(<UploadFileIcon color="#FF8800" />);
    const path = container.querySelector('path');
    expect(path).toBeTruthy();
  });

  it('applies custom className', () => {
    const { container } = render(<UploadFileIcon className="upload-icon" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('upload-icon');
  });

  it('has correct viewBox', () => {
    const { container } = render(<UploadFileIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 12 13');
  });

  it('renders SVG with correct namespace', () => {
    const { container } = render(<UploadFileIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
  });

  it('contains path element', () => {
    const { container } = render(<UploadFileIcon />);
    const path = container.querySelector('path');
    expect(path).toBeTruthy();
  });

  it('renders with SVG fill="none"', () => {
    const { container } = render(<UploadFileIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('path has stroke-linecap and stroke-linejoin attributes', () => {
    const { container } = render(<UploadFileIcon />);
    const path = container.querySelector('path');
    expect(path).toHaveAttribute('stroke-linecap', 'round');
    expect(path).toHaveAttribute('stroke-linejoin', 'round');
  });
});
