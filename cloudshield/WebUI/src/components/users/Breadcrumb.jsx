/**
 * Breadcrumb.jsx
 *
 * Breadcrumb navigation for multi-step forms
 * Shows current step and allows navigation to previous steps
 */

const styles = {
  container: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "16px 0",
  },
  step: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  stepButton: {
    background: "none",
    border: "none",
    color: "rgba(255,255,255,0.5)",
    fontSize: "0.875rem",
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: "6px",
    transition: "all 0.2s",
  },
  stepButtonActive: {
    color: "#fff",
    fontWeight: 600,
    cursor: "default",
  },
  stepButtonHover: {
    backgroundColor: "rgba(255,255,255,0.05)",
    color: "rgba(255,255,255,0.8)",
  },
  separator: {
    color: "rgba(255,255,255,0.3)",
    fontSize: "0.875rem",
    userSelect: "none",
  },
};

export default function Breadcrumb({ steps, currentStep, onStepClick }) {
  return (
    <nav style={styles.container} aria-label="Progress">
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isClickable = index < currentStep;

        return (
          <div key={index} style={styles.step}>
            {index > 0 && <span style={styles.separator}>›</span>}
            <button
              onClick={() => isClickable && onStepClick(index)}
              disabled={!isClickable && !isActive}
              style={{
                ...styles.stepButton,
                ...(isActive ? styles.stepButtonActive : {}),
                ...(isClickable
                  ? {}
                  : { cursor: isActive ? "default" : "not-allowed" }),
              }}
              onMouseEnter={(e) => {
                if (isClickable && !isActive) {
                  e.currentTarget.style.backgroundColor =
                    styles.stepButtonHover.backgroundColor;
                  e.currentTarget.style.color = styles.stepButtonHover.color;
                }
              }}
              onMouseLeave={(e) => {
                if (isClickable && !isActive) {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = styles.stepButton.color;
                }
              }}
            >
              {step}
            </button>
          </div>
        );
      })}
    </nav>
  );
}
