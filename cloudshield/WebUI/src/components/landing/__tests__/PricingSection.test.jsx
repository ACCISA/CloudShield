import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PricingSection from '../PricingSection.jsx';

// Mock the PlanCard to easily inspect the props passed down by the conditional logic
jest.mock('../../signup/PlanCard.jsx', () => {
  return function MockPlanCard({ plan, selected, onSelect }) {
    return (
      <div 
        data-testid={`plan-card-${plan.id}`}
        data-selected={selected}
        data-price={plan.price}
        onClick={() => onSelect(plan.id)}
      >
        {plan.name}
      </div>
    );
  };
});

describe('PricingSection Component', () => {
  it('renders default monthly prices and states', () => {
    render(<PricingSection />);
    
    // Check toggle button conditional classes
    const monthlyBtn = screen.getByText('monthly');
    const yearlyBtn = screen.getByText('yearly');
    
    expect(monthlyBtn).toHaveClass('active');
    expect(yearlyBtn).not.toHaveClass('active');
    
    // Check default monthly pricing logic
    expect(screen.getByTestId('plan-card-basic')).toHaveAttribute('data-price', '29');
    expect(screen.getByTestId('plan-card-pro')).toHaveAttribute('data-price', '59');
    expect(screen.getByTestId('plan-card-enterprise')).toHaveAttribute('data-price', '89');
  });

  it('toggles to yearly and correctly calculates the 20% discount', () => {
    render(<PricingSection />);
    
    const yearlyBtn = screen.getByText('yearly');
    const monthlyBtn = screen.getByText('monthly');
    
    // Click the toggle container/button
    fireEvent.click(yearlyBtn);
    
    // Verify conditional classes updated
    expect(yearlyBtn).toHaveClass('active');
    expect(monthlyBtn).not.toHaveClass('active');
    
    // Verify math conditional logic: Math.floor(basePrice * 0.8)
    // 29 * 0.8 = 23.2 -> 23
    expect(screen.getByTestId('plan-card-basic')).toHaveAttribute('data-price', '23');
    // 59 * 0.8 = 47.2 -> 47
    expect(screen.getByTestId('plan-card-pro')).toHaveAttribute('data-price', '47');
    // 89 * 0.8 = 71.2 -> 71
    expect(screen.getByTestId('plan-card-enterprise')).toHaveAttribute('data-price', '71');
  });

  it('updates the selected plan correctly when a card is clicked', () => {
    render(<PricingSection />);
    
    const proCard = screen.getByTestId('plan-card-pro');
    const basicCard = screen.getByTestId('plan-card-basic');
    
    // Initially null/false
    expect(proCard).toHaveAttribute('data-selected', 'false');
    expect(basicCard).toHaveAttribute('data-selected', 'false');
    
    // Trigger conditional onSelect logic
    fireEvent.click(proCard);
    
    // Verify state changed
    expect(proCard).toHaveAttribute('data-selected', 'true');
    expect(basicCard).toHaveAttribute('data-selected', 'false');
  });
});