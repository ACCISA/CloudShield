import { render } from '@testing-library/react';
import CardsIcon from '../../DisplayButton/CardsIcon';

describe('CardsIcon (RowsIcon)', () => {
  it('renders without crashing', () => {
    const { container } = render(<CardsIcon />);
    expect(container).toBeTruthy();
  });

  it('renders an SVG element', () => {
    const { container } = render(<CardsIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('uses default dimensions', () => {
    const { container } = render(<CardsIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '28');
    expect(svg).toHaveAttribute('height', '17');
  });

  it('accepts custom width and height', () => {
    const { container } = render(<CardsIcon width={56} height={34} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '56');
    expect(svg).toHaveAttribute('height', '34');
  });

  it('uses default color', () => {
    const { container } = render(<CardsIcon />);
    const rects = container.querySelectorAll('rect');
    rects.forEach((rect) => {
      expect(rect).toHaveAttribute('stroke', '#2E2E2E');
    });
  });

  it('accepts custom color', () => {
    const { container } = render(<CardsIcon color="#FF0000" />);
    const rects = container.querySelectorAll('rect');
    rects.forEach((rect) => {
      expect(rect).toHaveAttribute('stroke', '#FF0000');
    });
  });

  it('applies custom className', () => {
    const { container } = render(<CardsIcon className="cards-icon" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('cards-icon');
  });

  it('has correct viewBox', () => {
    const { container } = render(<CardsIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 28 17');
  });

  it('renders SVG with correct namespace', () => {
    const { container } = render(<CardsIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
  });

  it('contains two rect elements', () => {
    const { container } = render(<CardsIcon />);
    const rects = container.querySelectorAll('rect');
    expect(rects).toHaveLength(2);
  });

  it('renders with SVG fill="none"', () => {
    const { container } = render(<CardsIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('fill', 'none');
  });
});
