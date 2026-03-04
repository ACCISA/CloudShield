import React, { useState } from 'react';
import PlanCard from '../signup/PlanCard';

const PLAN_OPTIONS = [
  {
    id: "basic",
    name: "Beginner",
    basePrice: 29,
    description: "Perfect for small teams exploring AI.",
    features: [
      "Basic Predictive Analytics",
      "Automated Workflows",
      "Standard NLP",
      "Real-Time Data Analysis",
      "Basic Dashboards",
      "Email Support",
    ],
  },
  {
    id: "pro",
    name: "Professional",
    basePrice: 59,
    tag: "Most Popular",
    description: "For growing businesses needing more advanced tools.",
    features: [
      "Advanced Predictive Analytics",
      "Automated Workflows",
      "Enhanced NLP",
      "Real-Time Data Analytics",
      "Advanced Dashboards",
      "Priority Email Support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    basePrice: 89,
    description: "Designed for enterprises requiring scale.",
    features: [
      "Comprehensive Predictive Analytics",
      "Automated Workflows",
      "Premium NLP",
      "Real-Time Data Analysis",
      "Custom Dashboards",
      "24/7 Dedicated Support",
    ],
  },
];

const PricingSection = () => {
  // Set to null so the middle card doesn't have the green glow by default
  const [selectedPlanId, setSelectedPlanId] = useState(null); 
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <section id="pricing" className="landing-pricing-section">
      <h2 className="landing-section-title">Flexible Pricing for Every Team Size</h2>
      <p className="landing-section-subtitle">
        Choose a plan that fits your current needs and scales with you. No hidden fees.
      </p>

      {/* Toggle matching the screenshot */}
      <div className="landing-billing-toggle-wrap">
        {/* onClick is now on the whole pill container to toggle back and forth */}
        <div 
          className="landing-billing-toggle-pill"
          onClick={() => setIsAnnual(!isAnnual)}
        >
          <button
            type="button"
            className={`landing-billing-toggle-btn ${!isAnnual ? 'active' : ''}`}
          >
            monthly
          </button>

          <button
            type="button"
            className={`landing-billing-toggle-btn ${isAnnual ? 'active' : ''}`}
          >
            yearly
          </button>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="landing-pricing-grid">
        {PLAN_OPTIONS.map((p) => {
          const displayPrice = isAnnual ? Math.floor(p.basePrice * 0.8) : p.basePrice;

          return (
            <PlanCard
              key={p.id}
              plan={{
                id: p.id,
                name: p.name,
                price: displayPrice,
                description: p.description,
                features: p.features,
                tag: p.tag
              }}
              selected={selectedPlanId === p.id}
              onSelect={(id) => setSelectedPlanId(id)}
            />
          );
        })}
      </div>
    </section>
  );
};

export default PricingSection;