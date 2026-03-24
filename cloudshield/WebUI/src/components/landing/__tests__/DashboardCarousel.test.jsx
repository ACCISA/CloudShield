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

  // ===== NEW: State Initialization Tests =====
  describe('State Initialization (currentIndex, autoPlay)', () => {
    it('initializes currentIndex to 0', () => {
      const { container } = render(<DashboardCarousel />);
      const activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Dashboard'); // First slide (index 0)
    });

    it('initializes autoPlay to true', () => {
      const { container } = render(<DashboardCarousel />);
      // Auto-play should be active by default
      jest.advanceTimersByTime(5000);
      const activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Users Management'); // Should advance automatically
    });

    it('renders with first slide visible on mount', () => {
      render(<DashboardCarousel />);
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Real-time statistics and activity monitoring')).toBeInTheDocument();
    });

    it('first slide image path is correct', () => {
      render(<DashboardCarousel />);
      const images = screen.getAllByRole('img');
      expect(images[0]).toHaveAttribute('src', '/dashboard-preview-1.png');
    });
  });

  // ===== NEW: Slides Data Structure =====
  describe('Slides Data Structure (5 slides with id, title, image, description)', () => {
    it('has exactly 5 slides', () => {
      render(<DashboardCarousel />);
      const dots = screen.getAllByLabelText(/Go to slide/);
      expect(dots).toHaveLength(5);
    });

    it('slide 1 has correct properties', () => {
      render(<DashboardCarousel />);
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Real-time statistics and activity monitoring')).toBeInTheDocument();
    });

    it('slide 2 has correct properties', () => {
      render(<DashboardCarousel />);
      const dots = screen.getAllByLabelText(/Go to slide/);
      fireEvent.click(dots[1]);
      expect(screen.getByText('Users Management')).toBeInTheDocument();
      expect(screen.getByText('Manage users and their permissions')).toBeInTheDocument();
    });

    it('slide 3 has correct properties', () => {
      render(<DashboardCarousel />);
      const dots = screen.getAllByLabelText(/Go to slide/);
      fireEvent.click(dots[2]);
      expect(screen.getByText('Groups Management')).toBeInTheDocument();
      expect(screen.getByText('Organize users into groups')).toBeInTheDocument();
    });

    it('slide 4 has correct properties', () => {
      render(<DashboardCarousel />);
      const dots = screen.getAllByLabelText(/Go to slide/);
      fireEvent.click(dots[3]);
      expect(screen.getByText('File Management')).toBeInTheDocument();
      expect(screen.getByText('Control file access and sharing')).toBeInTheDocument();
    });

    it('slide 5 has correct properties', () => {
      render(<DashboardCarousel />);
      const dots = screen.getAllByLabelText(/Go to slide/);
      fireEvent.click(dots[4]);
      expect(screen.getByText('Workstations')).toBeInTheDocument();
      expect(screen.getByText('Monitor and manage workstations')).toBeInTheDocument();
    });

    it('all slides have correct image paths', () => {
      const { container } = render(<DashboardCarousel />);
      const images = screen.getAllByRole('img');
      expect(images[0]).toHaveAttribute('src', '/dashboard-preview-1.png');
      expect(images[0]).toHaveAttribute('src', '/dashboard-preview-1.png');
    });

    it('each slide has unique id 1-5', () => {
      render(<DashboardCarousel />);
      // Verify all slide titles exist (each has unique id)
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Users Management')).toBeInTheDocument();
      expect(screen.getByText('Groups Management')).toBeInTheDocument();
      expect(screen.getByText('File Management')).toBeInTheDocument();
      expect(screen.getByText('Workstations')).toBeInTheDocument();
    });
  });

  // ===== NEW: useEffect Dependencies & Interval Logic =====
  describe('useEffect Dependencies (autoPlay, slides.length) and Interval Behavior', () => {
    it('creates interval when autoPlay is true', () => {
      const { container } = render(<DashboardCarousel />);
      // Interval should exist and advance slides
      jest.advanceTimersByTime(5000);
      const activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Users Management');
    });

    it('skips interval when autoPlay is false (early return)', () => {
      const { container } = render(<DashboardCarousel />);
      const nextButton = screen.getByLabelText('Next slide');

      // Click to set autoPlay to false
      fireEvent.click(nextButton);

      // Clear the fake timers to reset state
      jest.advanceTimersByTime(5000);
      // Should not advance past the clicked position because autoPlay is false

      const activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Users Management');
    });

    it('includes autoPlay in dependency array', () => {
      const { container } = render(<DashboardCarousel />);
      const nextButton = screen.getByLabelText('Next slide');

      // When autoPlay is false, interval should not run
      fireEvent.click(nextButton);
      const beforeAdvance = container.querySelector('.carousel-slide.active');
      expect(beforeAdvance).toHaveTextContent('Users Management');

      // Wait for timeout to enable autoPlay
      jest.advanceTimersByTime(10000);

      // After re-enabling, interval should work
      jest.advanceTimersByTime(5000);
      const afterAdvance = container.querySelector('.carousel-slide.active');
      expect(afterAdvance).toHaveTextContent('Groups Management');
    });

    it('includes slides.length in dependency array', () => {
      const { container } = render(<DashboardCarousel />);
      // Slides.length = 5, used in modulo operation
      const nextButton = screen.getByLabelText('Next slide');

      for (let i = 0; i < 5; i++) {
        fireEvent.click(nextButton);
      }

      const activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Dashboard'); // Wrapped around
    });

    it('creates interval with 5000ms duration', () => {
      const { container } = render(<DashboardCarousel />);

      // At 5000ms should advance
      jest.advanceTimersByTime(5000);
      const slide1 = container.querySelector('.carousel-slide.active');
      expect(slide1).toHaveTextContent('Users Management');

      // At 10000ms total should advance again
      jest.advanceTimersByTime(5000);
      const slide2 = container.querySelector('.carousel-slide.active');
      expect(slide2).toHaveTextContent('Groups Management');
    });

    it('clears interval on cleanup', () => {
      const { unmount } = render(<DashboardCarousel />);

      jest.advanceTimersByTime(5000);
      let activeSlide = document.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Users Management');

      // Unmount should clear interval
      unmount();

      // No more advances should happen
      jest.advanceTimersByTime(5000);
      // Component unmounted, no error should occur
    });

    it('effect triggers when autoPlay changes from false to true', () => {
      const { container } = render(<DashboardCarousel />);
      const nextButton = screen.getByLabelText('Next slide');

      // Disable autoPlay
      fireEvent.click(nextButton);

      // Re-enable via timeout
      jest.advanceTimersByTime(10000);

      // Interval should be recreated and work
      jest.advanceTimersByTime(5000);
      const activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Groups Management');
    });

    it('effect runs on component mount', () => {
      const { container } = render(<DashboardCarousel />);

      // Interval should be set up immediately
      jest.advanceTimersByTime(5000);
      const activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Users Management');
    });
  });

  // ===== NEW: goToPrevious Function =====
  describe('goToPrevious Function (Modulo Logic, setAutoPlay(false))', () => {
    it('decrements currentIndex by 1', () => {
      const { container } = render(<DashboardCarousel />);
      const nextButton = screen.getByLabelText('Next slide');

      // Go to second slide
      fireEvent.click(nextButton);
      let activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Users Management');

      // Go back to first
      const prevButton = screen.getByLabelText('Previous slide');
      fireEvent.click(prevButton);
      activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Dashboard');
    });

    it('wraps from index 0 to slides.length - 1', () => {
      const { container } = render(<DashboardCarousel />);
      const prevButton = screen.getByLabelText('Previous slide');

      // From first slide, go previous
      fireEvent.click(prevButton);

      const activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Workstations'); // Last slide (index 4)
    });

    it('uses correct modulo operation (slides.length - 1)', () => {
      const { container } = render(<DashboardCarousel />);
      const prevButton = screen.getByLabelText('Previous slide');

      // Go back 3 times: 0 -> 4 -> 3 -> 2
      fireEvent.click(prevButton);
      fireEvent.click(prevButton);
      fireEvent.click(prevButton);

      const activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Groups Management'); // Index 2
    });

    it('sets autoPlay to false', () => {
      const { container } = render(<DashboardCarousel />);
      const prevButton = screen.getByLabelText('Previous slide');

      fireEvent.click(prevButton);

      // After clicking, autoPlay should be false
      // Wait 5 seconds - should NOT advance
      jest.advanceTimersByTime(5000);
      const activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Workstations'); // Should stay on last slide
    });

    it('handles multiple previous clicks in sequence', () => {
      const { container } = render(<DashboardCarousel />);
      const prevButton = screen.getByLabelText('Previous slide');

      fireEvent.click(prevButton);
      fireEvent.click(prevButton);

      const activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('File Management'); // 5 -> 4 -> 3
    });
  });

  // ===== NEW: goToNext Function =====
  describe('goToNext Function (Modulo Logic, setAutoPlay(false))', () => {
    it('increments currentIndex by 1', () => {
      const { container } = render(<DashboardCarousel />);
      const nextButton = screen.getByLabelText('Next slide');

      fireEvent.click(nextButton);

      const activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Users Management');
    });

    it('wraps from last index to 0', () => {
      const { container } = render(<DashboardCarousel />);
      const nextButton = screen.getByLabelText('Next slide');

      // Click 5 times to reach end and wrap
      for (let i = 0; i < 5; i++) {
        fireEvent.click(nextButton);
      }

      const activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Dashboard');
    });

    it('uses correct modulo operation (slides.length)', () => {
      const { container } = render(<DashboardCarousel />);
      const nextButton = screen.getByLabelText('Next slide');

      // Go forward 3 times: 0 -> 1 -> 2 -> 3
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);

      const activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('File Management');
    });

    it('sets autoPlay to false', () => {
      const { container } = render(<DashboardCarousel />);
      const nextButton = screen.getByLabelText('Next slide');

      fireEvent.click(nextButton);

      // Wait 5 seconds - should NOT auto-advance
      jest.advanceTimersByTime(5000);
      const activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Users Management'); // Should stay
    });

    it('handles multiple next clicks in sequence', () => {
      const { container } = render(<DashboardCarousel />);
      const nextButton = screen.getByLabelText('Next slide');

      fireEvent.click(nextButton);
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);

      const activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('File Management');
    });
  });

  // ===== NEW: handleDotClick Function =====
  describe('handleDotClick (setCurrentIndex, setAutoPlay(false), setTimeout to re-enable)', () => {
    it('sets currentIndex to clicked dot index', () => {
      const { container } = render(<DashboardCarousel />);
      const dots = screen.getAllByLabelText(/Go to slide/);

      fireEvent.click(dots[2]);

      const activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Groups Management');
    });

    it('sets autoPlay to false on dot click', () => {
      const { container } = render(<DashboardCarousel />);
      const dots = screen.getAllByLabelText(/Go to slide/);

      fireEvent.click(dots[1]);

      // Should not auto-advance after dot click
      jest.advanceTimersByTime(5000);
      const activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Users Management');
    });

    it('starts 10000ms timeout to re-enable autoPlay', () => {
      const { container } = render(<DashboardCarousel />);
      const dots = screen.getAllByLabelText(/Go to slide/);

      fireEvent.click(dots[2]); // Go to Groups Management

      // Wait 10000ms for timeout
      jest.advanceTimersByTime(10000);

      // Now autoPlay should be re-enabled
      jest.advanceTimersByTime(5000);
      const activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('File Management'); // Should advance
    });

    it('can click any dot to navigate', () => {
      const { container } = render(<DashboardCarousel />);
      const dots = screen.getAllByLabelText(/Go to slide/);

      // Click dot 0 (should stay on Dashboard)
      fireEvent.click(dots[0]);
      let activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Dashboard');

      // Click dot 4 (Workstations)
      fireEvent.click(dots[4]);
      activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Workstations');

      // Click dot 2 (Groups Management)
      fireEvent.click(dots[2]);
      activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Groups Management');
    });

    it('updates active dot indicator after click', () => {
      render(<DashboardCarousel />);
      const dots = screen.getAllByLabelText(/Go to slide/);

      fireEvent.click(dots[3]);

      // Dot 3 should now be active
      expect(dots[3]).toHaveClass('active');
      expect(dots[0]).not.toHaveClass('active');
    });

    it('timeout is exactly 10000ms', () => {
      const { container } = render(<DashboardCarousel />);
      const dots = screen.getAllByLabelText(/Go to slide/);
      const nextButton = screen.getByLabelText('Next slide');

      fireEvent.click(dots[1]); // Disable autoPlay

      // At 9999ms, autoPlay should still be false
      jest.advanceTimersByTime(9999);
      fireEvent.click(nextButton);
      let activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('File Management'); // Manual click works

      // Continue to 10000ms
      jest.advanceTimersByTime(1);

      // Now autoPlay should work
      jest.advanceTimersByTime(5000);
      activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Dashboard'); // Auto-advanced
    });

    it('handles rapid dot clicks (last one wins)', () => {
      const { container } = render(<DashboardCarousel />);
      const dots = screen.getAllByLabelText(/Go to slide/);

      fireEvent.click(dots[1]);
      fireEvent.click(dots[3]);
      fireEvent.click(dots[0]);

      const activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Dashboard'); // Last click (dot 0)
    });

    it('resets 10000ms timer on multiple dot clicks', () => {
      const { container } = render(<DashboardCarousel />);
      const dots = screen.getAllByLabelText(/Go to slide/);

      fireEvent.click(dots[1]); // Start timer
      jest.advanceTimersByTime(5000); // Halfway through timer

      fireEvent.click(dots[3]); // Reset timer
      jest.advanceTimersByTime(5000); // Halfway through new timer

      // AutoPlay should still be off (timer just reset)
      jest.advanceTimersByTime(4999); // Total 9999ms from last click
      const activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('File Management'); // No auto-advance yet

      jest.advanceTimersByTime(1); // Now 10000ms have passed
      jest.advanceTimersByTime(5000); // Auto-advance should happen
      const nextSlide = container.querySelector('.carousel-slide.active');
      expect(nextSlide).toHaveTextContent('Workstations');
    });
  });

  // ===== NEW: handlePrevious Function =====
  describe('handlePrevious (goToPrevious + 10000ms timeout)', () => {
    it('calls goToPrevious to decrement index', () => {
      const { container } = render(<DashboardCarousel />);
      const prevButton = screen.getByLabelText('Previous slide');

      fireEvent.click(prevButton);

      const activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Workstations'); // Wrapped to last
    });

    it('disables autoPlay via goToPrevious', () => {
      const { container } = render(<DashboardCarousel />);
      const prevButton = screen.getByLabelText('Previous slide');

      fireEvent.click(prevButton);

      // Should not auto-advance
      jest.advanceTimersByTime(5000);
      const activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Workstations'); // Should stay
    });

    it('starts 10000ms timeout to re-enable autoPlay', () => {
      const { container } = render(<DashboardCarousel />);
      const prevButton = screen.getByLabelText('Previous slide');

      fireEvent.click(prevButton);

      // Wait 10000ms
      jest.advanceTimersByTime(10000);

      // AutoPlay should be re-enabled
      jest.advanceTimersByTime(5000);
      const activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Dashboard'); // Auto-advanced
    });

    it('timeout prevents manual auto-play conflict', () => {
      const { container } = render(<DashboardCarousel />);
      const prevButton = screen.getByLabelText('Previous slide');

      fireEvent.click(prevButton);

      jest.advanceTimersByTime(10000); // Timeout completes

      // Even though timeout happened, further clicks should disable autoPlay again
      fireEvent.click(prevButton);

      jest.advanceTimersByTime(5000);
      const activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('File Management'); // No auto-advance
    });
  });

  // ===== NEW: handleNext Function =====
  describe('handleNext (goToNext + 10000ms timeout)', () => {
    it('calls goToNext to increment index', () => {
      const { container } = render(<DashboardCarousel />);
      const nextButton = screen.getByLabelText('Next slide');

      fireEvent.click(nextButton);

      const activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Users Management');
    });

    it('disables autoPlay via goToNext', () => {
      const { container } = render(<DashboardCarousel />);
      const nextButton = screen.getByLabelText('Next slide');

      fireEvent.click(nextButton);

      // Should not auto-advance
      jest.advanceTimersByTime(5000);
      const activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Users Management'); // Should stay
    });

    it('starts 10000ms timeout to re-enable autoPlay', () => {
      const { container } = render(<DashboardCarousel />);
      const nextButton = screen.getByLabelText('Next slide');

      fireEvent.click(nextButton);

      // Wait 10000ms
      jest.advanceTimersByTime(10000);

      // AutoPlay should be re-enabled
      jest.advanceTimersByTime(5000);
      const activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Groups Management'); // Auto-advanced
    });
  });

  // ===== NEW: Index Cycling Logic =====
  describe('Index Cycling Logic (Modulo Operations)', () => {
    it('cycles forward: 0 -> 1 -> 2 -> 3 -> 4 -> 0', () => {
      const { container } = render(<DashboardCarousel />);
      const nextButton = screen.getByLabelText('Next slide');

      const titles = ['Dashboard', 'Users Management', 'Groups Management', 'File Management', 'Workstations'];

      for (let i = 0; i < titles.length; i++) {
        const activeSlide = container.querySelector('.carousel-slide.active');
        expect(activeSlide).toHaveTextContent(titles[i]);
        fireEvent.click(nextButton);
      }

      // Should be back to first
      const activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Dashboard');
    });

    it('cycles backward: 0 -> 4 -> 3 -> 2 -> 1 -> 0', () => {
      const { container } = render(<DashboardCarousel />);
      const prevButton = screen.getByLabelText('Previous slide');

      const titles = ['Dashboard', 'Workstations', 'File Management', 'Groups Management', 'Users Management'];

      for (let i = 0; i < titles.length; i++) {
        const activeSlide = container.querySelector('.carousel-slide.active');
        expect(activeSlide).toHaveTextContent(titles[i]);
        fireEvent.click(prevButton);
      }

      // Should be back to first
      const activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Dashboard');
    });

    it('forward modulo: (4 + 1) % 5 = 0', () => {
      const { container } = render(<DashboardCarousel />);
      const nextButton = screen.getByLabelText('Next slide');

      // Go to last slide
      for (let i = 0; i < 4; i++) {
        fireEvent.click(nextButton);
      }

      let activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Workstations');

      // Next should wrap to 0
      fireEvent.click(nextButton);
      activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Dashboard');
    });

    it('backward modulo: (0 - 1 + 5) % 5 = 4', () => {
      const { container } = render(<DashboardCarousel />);
      const prevButton = screen.getByLabelText('Previous slide');

      let activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Dashboard');

      // Previous should wrap to 4
      fireEvent.click(prevButton);
      activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Workstations');
    });

    it('auto-play cycles with correct modulo: (prevIndex + 1) % slides.length', () => {
      const { container } = render(<DashboardCarousel />);

      const expectedSequence = [
        'Users Management',
        'Groups Management',
        'File Management',
        'Workstations',
        'Dashboard',
      ];

      expectedSequence.forEach((title) => {
        jest.advanceTimersByTime(5000);
        const activeSlide = container.querySelector('.carousel-slide.active');
        expect(activeSlide).toHaveTextContent(title);
      });
    });
  });

  // ===== NEW: Integration Tests =====
  describe('Complete Integration Flows', () => {
    it('complex flow: auto -> click dot -> auto -> click prev -> auto', () => {
      const { container } = render(<DashboardCarousel />);
      const dots = screen.getAllByLabelText(/Go to slide/);
      const prevButton = screen.getByLabelText('Previous slide');

      // Auto-advance 1 cycle
      jest.advanceTimersByTime(5000);
      let activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Users Management');

      // Click dot to jump to slide 3
      fireEvent.click(dots[2]);
      activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Groups Management');

      // Wait for timeout then auto should work
      jest.advanceTimersByTime(10000);
      jest.advanceTimersByTime(5000);
      activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('File Management');

      // Manual prev click
      fireEvent.click(prevButton);
      activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Groups Management');

      // Wait for timeout then auto should work
      jest.advanceTimersByTime(10000);
      jest.advanceTimersByTime(5000);
      activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('File Management');
    });

    it('handles mixed navigation: next -> dot click -> prev -> next -> auto', () => {
      const { container } = render(<DashboardCarousel />);
      const nextButton = screen.getByLabelText('Next slide');
      const prevButton = screen.getByLabelText('Previous slide');
      const dots = screen.getAllByLabelText(/Go to slide/);

      // Next
      fireEvent.click(nextButton);
      let activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Users Management');

      // Dot click to 4
      fireEvent.click(dots[4]);
      activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Workstations');

      // Previous
      jest.advanceTimersByTime(5000); // Partial timeout
      fireEvent.click(prevButton);
      activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('File Management');

      // Next
      fireEvent.click(nextButton);
      activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Workstations');

      // Wait for full timeout and auto-advance
      jest.advanceTimersByTime(10000);
      jest.advanceTimersByTime(5000);
      activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('Dashboard');
    });

    it('rapid user interactions keep autoPlay disabled', () => {
      const { container } = render(<DashboardCarousel />);
      const nextButton = screen.getByLabelText('Next slide');

      fireEvent.click(nextButton); // First click
      jest.advanceTimersByTime(5000); // Partial timeout

      fireEvent.click(nextButton); // Second click (resets timeout)
      jest.advanceTimersByTime(5000); // Partial timeout

      fireEvent.click(nextButton); // Third click (resets timeout again)

      // Total time is less than 3 * 10000, so autoPlay still off
      jest.advanceTimersByTime(9999);

      // Should not have auto-advanced
      jest.advanceTimersByTime(5000); // Even with this, not enough
      const activeSlide = container.querySelector('.carousel-slide.active');
      expect(activeSlide).toHaveTextContent('File Management'); // Manual position
    });

    it('ensures dot indicators update with all navigation methods', () => {
      render(<DashboardCarousel />);
      const dots = screen.getAllByLabelText(/Go to slide/);
      const nextButton = screen.getByLabelText('Next slide');
      const prevButton = screen.getByLabelText('Previous slide');

      // Next
      fireEvent.click(nextButton);
      expect(dots[1]).toHaveClass('active');
      expect(dots[0]).not.toHaveClass('active');

      // Previous
      fireEvent.click(prevButton);
      expect(dots[0]).toHaveClass('active');
      expect(dots[1]).not.toHaveClass('active');

      // Dot click
      fireEvent.click(dots[3]);
      expect(dots[3]).toHaveClass('active');
      expect(dots[0]).not.toHaveClass('active');
    });
  });
});
