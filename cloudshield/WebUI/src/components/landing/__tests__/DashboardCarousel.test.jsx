import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DashboardCarousel from '../DashboardCarousel';

describe('DashboardCarousel Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders without crashing', () => {
    render(<DashboardCarousel />);
    const carousel = screen.getByRole('img', { name: /Dashboard/i });
    expect(carousel).toBeInTheDocument();
  });

  it('renders all slide titles', () => {
    render(<DashboardCarousel />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Users Management')).toBeInTheDocument();
    expect(screen.getByText('Groups Management')).toBeInTheDocument();
    expect(screen.getByText('File Management')).toBeInTheDocument();
    expect(screen.getByText('Workstations')).toBeInTheDocument();
  });

  it('renders all slide descriptions', () => {
    render(<DashboardCarousel />);
    expect(
      screen.getByText('Real-time statistics and activity monitoring')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Manage users and their permissions')
    ).toBeInTheDocument();
  });

  it('renders navigation buttons', () => {
    render(<DashboardCarousel />);
    expect(screen.getByLabelText('Previous slide')).toBeInTheDocument();
    expect(screen.getByLabelText('Next slide')).toBeInTheDocument();
  });

  it('renders dot navigation indicators for all slides', () => {
    render(<DashboardCarousel />);
    const dots = screen.getAllByLabelText(/Go to slide/);
    expect(dots).toHaveLength(5);
  });

  it('first slide is active by default', () => {
    const { container } = render(<DashboardCarousel />);
    const activeSlide = container.querySelector('.carousel-slide.active');
    expect(activeSlide).toBeInTheDocument();
    expect(activeSlide).toHaveTextContent('Dashboard');
  });

  it('advances to next slide when next button is clicked', () => {
    const { container } = render(<DashboardCarousel />);
    const nextButton = screen.getByLabelText('Next slide');

    fireEvent.click(nextButton);

    const activeSlide = container.querySelector('.carousel-slide.active');
    expect(activeSlide).toHaveTextContent('Users Management');
  });

  it('goes to previous slide when previous button is clicked', () => {
    const { container } = render(<DashboardCarousel />);
    const nextButton = screen.getByLabelText('Next slide');
    const prevButton = screen.getByLabelText('Previous slide');

    // Move to next slide
    fireEvent.click(nextButton);
    // Go back
    fireEvent.click(prevButton);

    const activeSlide = container.querySelector('.carousel-slide.active');
    expect(activeSlide).toHaveTextContent('Dashboard');
  });

  it('wraps to last slide when going previous from first slide', () => {
    const { container } = render(<DashboardCarousel />);
    const prevButton = screen.getByLabelText('Previous slide');

    fireEvent.click(prevButton);

    const activeSlide = container.querySelector('.carousel-slide.active');
    expect(activeSlide).toHaveTextContent('Workstations');
  });

  it('wraps to first slide when going next from last slide', () => {
    const { container } = render(<DashboardCarousel />);
    const nextButton = screen.getByLabelText('Next slide');

    // Click next 5 times to reach last slide and wrap around
    for (let i = 0; i < 5; i++) {
      fireEvent.click(nextButton);
    }

    const activeSlide = container.querySelector('.carousel-slide.active');
    expect(activeSlide).toHaveTextContent('Dashboard');
  });

  it('navigates to specific slide when dot is clicked', () => {
    const { container } = render(<DashboardCarousel />);
    const dots = screen.getAllByLabelText(/Go to slide/);

    fireEvent.click(dots[2]); // Go to third slide (Groups Management)

    const activeSlide = container.querySelector('.carousel-slide.active');
    expect(activeSlide).toHaveTextContent('Groups Management');
  });

  it('shows active dot indicator for current slide', () => {
    render(<DashboardCarousel />);
    const dots = screen.getAllByLabelText(/Go to slide/);

    // First dot should be active initially
    expect(dots[0]).toHaveClass('carousel-dot active');
    expect(dots[1]).not.toHaveClass('active');
  });

  it('updates active dot when slide changes', () => {
    render(<DashboardCarousel />);
    const dots = screen.getAllByLabelText(/Go to slide/);
    const nextButton = screen.getByLabelText('Next slide');

    fireEvent.click(nextButton);

    expect(dots[0]).not.toHaveClass('active');
    expect(dots[1]).toHaveClass('carousel-dot active');
  });

  it('auto-advances slides after 5 seconds', () => {
    const { container } = render(<DashboardCarousel />);

    jest.advanceTimersByTime(5000);

    const activeSlide = container.querySelector('.carousel-slide.active');
    expect(activeSlide).toHaveTextContent('Users Management');
  });

  it('continues auto-play after multiple intervals', () => {
    const { container } = render(<DashboardCarousel />);

    jest.advanceTimersByTime(5000);
    let activeSlide = container.querySelector('.carousel-slide.active');
    expect(activeSlide).toHaveTextContent('Users Management');

    jest.advanceTimersByTime(5000);
    activeSlide = container.querySelector('.carousel-slide.active');
    expect(activeSlide).toHaveTextContent('Groups Management');
  });

  it('resumes auto-play after user interaction', () => {
    const { container } = render(<DashboardCarousel />);
    const nextButton = screen.getByLabelText('Next slide');

    fireEvent.click(nextButton);
    jest.advanceTimersByTime(10000); // Wait for auto-play to resume

    jest.advanceTimersByTime(5000); // Auto-play should advance now

    const activeSlide = container.querySelector('.carousel-slide.active');
    expect(activeSlide).toHaveTextContent('Groups Management');
  });

  it('renders carousel container with correct structure', () => {
    const { container } = render(<DashboardCarousel />);
    expect(container.querySelector('.dashboard-carousel')).toBeInTheDocument();
    expect(container.querySelector('.carousel-container')).toBeInTheDocument();
    expect(container.querySelector('.carousel-slides')).toBeInTheDocument();
  });

  it('has appropriate aria labels for accessibility', () => {
    render(<DashboardCarousel />);
    expect(screen.getByLabelText('Previous slide')).toBeInTheDocument();
    expect(screen.getByLabelText('Next slide')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to slide 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to slide 5')).toBeInTheDocument();
  });

  it('handles multiple rapid clicks correctly', () => {
    const { container } = render(<DashboardCarousel />);
    const nextButton = screen.getByLabelText('Next slide');

    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);

    const activeSlide = container.querySelector('.carousel-slide.active');
    expect(activeSlide).toHaveTextContent('File Management');
  });
});
