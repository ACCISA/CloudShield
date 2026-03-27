import React from "react";
import "../../pages/auth.css";

export default function PlanCard({ plan, selected, onSelect }) {
  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(plan.id);
    }
  };

  return (
    <button
      type="button"
      className={`plan-card${selected ? " selected" : ""}`}
      onClick={() => onSelect(plan.id)}
      onKeyDown={handleKeyDown}
      aria-label={`Select ${plan.name} plan for $${plan.price} per month`}
      aria-pressed={selected}
    >
      <p className="plan-card__price">${plan.price}</p>
      <p className="plan-card__period">/ Per Month</p>
      <div className="plan-card__name">
        {plan.name}
        {plan.tag && <span className="plan-card__tag">{plan.tag}</span>}
      </div>
      <p className="plan-card__desc">{plan.description}</p>
      <hr className="plan-card__divider" />
      <p className="plan-card__features-label">Features:</p>
      {plan.features.map((f) => (
        <p key={f} className="plan-card__feature">
          <span className="plan-card__check">✓</span>
          {f}
        </p>
      ))}
    </button>
  );
}
