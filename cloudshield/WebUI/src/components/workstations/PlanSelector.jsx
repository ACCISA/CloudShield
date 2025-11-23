/**
 * PlanSelector.jsx
 *
 * Purpose:
 *   Reusable plan selection component for workstation dialogs.
 *
 * Props:
 *   - selectedPlan: currently selected plan ID
 *   - onPlanSelect: callback when a plan is selected
 *   - showCurrent: boolean to show "CURRENT" badge on BASIC plan when selected
 */
import React from "react";

const styles = {
  container: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "12px",
    marginTop: "16px",
  },
  planCard: {
    padding: "16px",
    borderRadius: "12px",
    backgroundColor: "#121212",
    cursor: "pointer",
  },
  planCardSelected: {
    border: "2px solid #2de36b",
  },
  planCardUnselected: {
    border: "1px solid rgba(255,255,255,0.18)",
  },
  planTitle: {
    fontWeight: 700,
    marginBottom: "8px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#fff",
  },
  currentBadge: {
    fontSize: "0.7rem",
    opacity: 0.7,
    border: "1px solid rgba(255,255,255,0.25)",
    padding: "2px 8px",
    borderRadius: "999px",
  },
  feature: {
    fontSize: "0.9rem",
    opacity: 0.9,
    color: "#fff",
  },
};

const plans = [
  {
    id: "BASIC",
    title: "BASIC",
    features: ["8 CPU cores", "12 GPU cores", "8 GB RAM", "200 GB SSD"],
  },
  {
    id: "PRO",
    title: "PRO",
    features: ["8 CPU cores", "12 GPU cores", "8 GB RAM", "200 GB SSD"],
  },
  {
    id: "ULTIMATE",
    title: "ULTIMATE",
    features: ["8 CPU cores", "12 GPU cores", "8 GB RAM", "200 GB SSD"],
  },
];

/**
 * Plan selection component with visual cards.
 * @param {Object} props
 * @param {string} props.selectedPlan - Currently selected plan ID
 * @param {Function} props.onPlanSelect - Called when a plan is selected
 * @param {boolean} props.showCurrent - Show "CURRENT" badge on selected plan
 * @returns {JSX.Element} Plan selection grid
 */
export default function PlanSelector({
  selectedPlan,
  onPlanSelect,
  showCurrent = false,
}) {
  return (
    <div style={styles.container}>
      {plans.map((p) => {
        const selected = selectedPlan === p.id;
        return (
          <div
            key={p.id}
            onClick={() => onPlanSelect(p.id)}
            style={{
              ...styles.planCard,
              ...(selected
                ? styles.planCardSelected
                : styles.planCardUnselected),
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = selected
                ? "#2de36b"
                : "rgba(255,255,255,0.35)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = selected
                ? "#2de36b"
                : "rgba(255,255,255,0.18)")
            }
          >
            <div style={styles.planTitle}>
              {p.title}
              {showCurrent && p.id === "BASIC" && selected && (
                <span style={styles.currentBadge}>CURRENT</span>
              )}
            </div>
            {p.features.map((f) => (
              <div key={f} style={styles.feature}>
                ✓ {f}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
