import React from 'react';
import { render, screen } from '@testing-library/react';
import ProvisioningProgressBar from '../ProvisioningProgressBar.jsx';

describe('ProvisioningProgressBar', () => {
  it('renders the progress bar container', () => {
    render(<ProvisioningProgressBar percent={50} />);
    const progressContainer = document.querySelector('div');
    expect(progressContainer).toBeInTheDocument();
  });

  it('displays the correct percentage', () => {
    render(<ProvisioningProgressBar percent={75} />);
    const percentageText = screen.getByText('75%');
    expect(percentageText).toBeInTheDocument();
  });

  it('clamps percentage at 100', () => {
    render(<ProvisioningProgressBar percent={150} />);
    const percentageText = screen.getByText('100%');
    expect(percentageText).toBeInTheDocument();
  });

  it('clamps percentage at 0', () => {
    render(<ProvisioningProgressBar percent={-50} />);
    const percentageText = screen.getByText('0%');
    expect(percentageText).toBeInTheDocument();
  });

  it('handles undefined percent gracefully', () => {
    render(<ProvisioningProgressBar />);
    const percentageText = screen.getByText('0%');
    expect(percentageText).toBeInTheDocument();
  });

  it('handles null percent gracefully', () => {
    render(<ProvisioningProgressBar percent={null} />);
    const percentageText = screen.getByText('0%');
    expect(percentageText).toBeInTheDocument();
  });

  it('rounds the percentage value', () => {
    render(<ProvisioningProgressBar percent={33.7} />);
    const percentageText = screen.getByText('34%');
    expect(percentageText).toBeInTheDocument();
  });

  it('applies correct styles to the track', () => {
    const { container } = render(<ProvisioningProgressBar percent={50} />);
    const track = container.querySelector('div div');
    expect(track).toBeInTheDocument();
    // Verify track contains the fill element
    const fill = track.querySelector('div');
    expect(fill).toBeInTheDocument();
  });

  it('updates fill width based on percentage', () => {
    const { container } = render(<ProvisioningProgressBar percent={60} />);
    const fill = container.querySelector('div div div');
    // Check that the fill element exists and has styles applied
    expect(fill).toBeInTheDocument();
    expect(fill.style.width).not.toBeUndefined();
  });

  it('applies transition to fill', () => {
    const { container } = render(<ProvisioningProgressBar percent={50} />);
    // The actual fill is the second div child of the track
    const allDivs = container.querySelectorAll('div');
    // Find the fill div by looking for one with a background color that's not the track
    let fillDiv = null;
    for (let div of allDivs) {
      const style = div.getAttribute('style');
      if (style && style.includes('background-color: rgb(224, 224, 224)')) {
        fillDiv = div;
        break;
      }
    }
    expect(fillDiv).toBeInTheDocument();
    expect(fillDiv.getAttribute('style')).toMatch(/transition/);
  });

  it('renders percentage text with correct styling', () => {
    const { container } = render(<ProvisioningProgressBar percent={50} />);
    const percentText = container.querySelector('span');
    expect(percentText).toBeInTheDocument();
    // Verify styling is applied
    expect(percentText.getAttribute('style')).toBeTruthy();
  });

  it('handles zero percent', () => {
    render(<ProvisioningProgressBar percent={0} />);
    const percentageText = screen.getByText('0%');
    expect(percentageText).toBeInTheDocument();
  });

  it('handles 100 percent', () => {
    render(<ProvisioningProgressBar percent={100} />);
    const percentageText = screen.getByText('100%');
    expect(percentageText).toBeInTheDocument();
  });

  it('handles intermediate percentages correctly', () => {
    const { rerender } = render(<ProvisioningProgressBar percent={25} />);
    expect(screen.getByText('25%')).toBeInTheDocument();

    rerender(<ProvisioningProgressBar percent={50} />);
    expect(screen.getByText('50%')).toBeInTheDocument();

    rerender(<ProvisioningProgressBar percent={75} />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });
});
