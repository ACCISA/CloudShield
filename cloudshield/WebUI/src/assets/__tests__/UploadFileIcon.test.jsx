import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import UploadFileIcon from '../UploadFileIcon';

describe('UploadFileIcon', () => {
  it('renders without crashing', () => {
    const { container } = render(<UploadFileIcon />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders with default props', () => {
    const { container } = render(<UploadFileIcon />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveAttribute('width', '12');
    expect(svg).toHaveAttribute('height', '13');
    expect(svg).toHaveAttribute('viewBox', '0 0 12 13');
  });

  it('renders with custom width and height', () => {
    const { container } = render(<UploadFileIcon width={24} height={26} />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '26');
  });

  it('renders with custom color', () => {
    const { container } = render(<UploadFileIcon color="#0066FF" />);
    const svg = container.querySelector('svg');
    const path = svg.querySelector('path');
    
    expect(path).toHaveAttribute('stroke', '#0066FF');
  });

  it('renders with default color white', () => {
    const { container } = render(<UploadFileIcon />);
    const svg = container.querySelector('svg');
    const path = svg.querySelector('path');
    
    expect(path).toHaveAttribute('stroke', 'white');
  });

  it('applies className prop', () => {
    const { container } = render(<UploadFileIcon className="upload-icon" />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveClass('upload-icon');
  });

  it('renders single path element', () => {
    const { container } = render(<UploadFileIcon />);
    const svg = container.querySelector('svg');
    const paths = svg.querySelectorAll('path');
    
    expect(paths.length).toBe(1);
  });

  it('renders with correct viewBox', () => {
    const { container } = render(<UploadFileIcon />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveAttribute('viewBox', '0 0 12 13');
  });

  it('renders with fill="none"', () => {
    const { container } = render(<UploadFileIcon />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveAttribute('fill', 'none');
  });

  it('renders path with strokeLinecap="round"', () => {
    const { container } = render(<UploadFileIcon />);
    const path = container.querySelector('path');
    
    expect(path).toHaveAttribute('strokeLinecap', 'round');
  });

  it('renders path with strokeLinejoin="round"', () => {
    const { container } = render(<UploadFileIcon />);
    const path = container.querySelector('path');
    
    expect(path).toHaveAttribute('strokeLinejoin', 'round');
  });

  it('renders with xmlns attribute', () => {
    const { container } = render(<UploadFileIcon />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
  });

  it('renders with different colors', () => {
    const colors = ['#FFFFFF', '#000000', '#FF0000', '#00FF00'];
    
    colors.forEach(color => {
      const { container } = render(<UploadFileIcon color={color} />);
      const path = container.querySelector('path');
      
      expect(path).toHaveAttribute('stroke', color);
    });
  });

  it('renders with combined props', () => {
    const { container } = render(
      <UploadFileIcon 
        width={18} 
        height={20} 
        color="#FF6600"
        className="large-upload orange"
      />
    );
    const svg = container.querySelector('svg');
    const path = svg.querySelector('path');
    
    expect(svg).toHaveAttribute('width', '18');
    expect(svg).toHaveAttribute('height', '20');
    expect(svg).toHaveClass('large-upload');
    expect(svg).toHaveClass('orange');
    expect(path).toHaveAttribute('stroke', '#FF6600');
  });
});
