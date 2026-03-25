import React, { useState, useEffect } from 'react';
import './DashboardCarousel.css';

const DashboardCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  // Since the images are in the public folder, we reference them directly from the root path '/'
  const slides = [
    {
      id: 1,
      title: 'Dashboard',
      image: '/dashboard-preview-1.png', 
      description: 'Real-time statistics and activity monitoring',
    },
    {
      id: 2,
      title: 'Users Management',
      image: '/dashboard-preview-2.png',
      description: 'Manage users and their permissions',
    },
    {
      id: 3,
      title: 'Groups Management',
      image: '/dashboard-preview-3.png',
      description: 'Organize users into groups',
    },
    {
      id: 4,
      title: 'File Management',
      image: '/dashboard-preview-4.png',
      description: 'Control file access and sharing',
    },
    {
      id: 5,
      title: 'Workstations',
      image: '/dashboard-preview-5.png',
      description: 'Monitor and manage workstations',
    },
  ];

  useEffect(() => {
    if (!autoPlay) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [autoPlay, slides.length]);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? slides.length - 1 : prevIndex - 1
    );
    setAutoPlay(false);
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
    setAutoPlay(false);
  };

  const handleDotClick = (index) => {
    setCurrentIndex(index);
    setAutoPlay(false);
    setTimeout(() => setAutoPlay(true), 10000);
  };

  const handlePrevious = () => {
    goToPrevious();
    setTimeout(() => setAutoPlay(true), 10000);
  };

  const handleNext = () => {
    goToNext();
    setTimeout(() => setAutoPlay(true), 10000);
  };

  return (
    <div className="dashboard-carousel">
      <div className="carousel-container">
        <div className="carousel-slides">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className={`carousel-slide ${index === currentIndex ? 'active' : ''}`}
            >
              <img 
                src={slide.image} 
                alt={slide.title} 
                className="carousel-image"
                onError={(e) => {
                  console.error(`Failed to load image: ${slide.image}`);
                  // Optional: e.target.src = '/fallback-image.png'; 
                }}
              />
              <div className="slide-overlay">
                <h3>{slide.title}</h3>
                <p>{slide.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Previous Button */}
        <button
          className="carousel-button carousel-button-prev"
          onClick={handlePrevious}
          aria-label="Previous slide"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Next Button */}
        <button
          className="carousel-button carousel-button-next"
          onClick={handleNext}
          aria-label="Next slide"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {/* Dots Navigation */}
        <div className="carousel-dots">
          {slides.map((_, index) => (
            <button
              key={index}
              className={`carousel-dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => handleDotClick(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardCarousel;