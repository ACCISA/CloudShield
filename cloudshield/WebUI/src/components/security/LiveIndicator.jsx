/**
 * LiveIndicator.jsx
 *
 * Purpose:
 *   Animated "LIVE" indicator with pulsing dot to show real-time monitoring.
 *
 * Features:
 *   - Pulsing green dot animation
 *   - "LIVE" text label
 *   - Minimal styling
 */
import React from "react";

function LiveIndicator() {
  const styles = {
    container: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "4px 10px",
    },
    dotContainer: {
      position: "relative",
      width: "6px",
      height: "6px",
    },
    dot: {
      width: "6px",
      height: "6px",
      backgroundColor: "#10B981",
      borderRadius: "50%",
      position: "absolute",
      animation: "breathe 1.5s ease-in-out infinite",
    },
    pulse: {
      width: "6px",
      height: "6px",
      backgroundColor: "#10B981",
      borderRadius: "50%",
      position: "absolute",
      animation: "pulse 1.5s cubic-bezier(0, 0.2, 0.8, 1) infinite",
      opacity: 0.8,
    },
    pulse2: {
      width: "6px",
      height: "6px",
      backgroundColor: "#10B981",
      borderRadius: "50%",
      position: "absolute",
      animation: "pulse 1.5s cubic-bezier(0, 0.2, 0.8, 1) infinite",
      animationDelay: "0.5s",
      opacity: 0.6,
    },
    pulse3: {
      width: "6px",
      height: "6px",
      backgroundColor: "#10B981",
      borderRadius: "50%",
      position: "absolute",
      animation: "pulse 1.5s cubic-bezier(0, 0.2, 0.8, 1) infinite",
      animationDelay: "1s",
      opacity: 0.4,
    },
    label: {
      fontSize: "11px",
      fontWeight: "600",
      color: "#10B981",
      letterSpacing: "0.5px",
    },
  };

  const keyframes = `
    @keyframes pulse {
      0% {
        transform: scale(1);
        opacity: 0.8;
      }
      100% {
        transform: scale(2.5);
        opacity: 0;
      }
    }
    
    @keyframes breathe {
      0%, 100% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.15);
        opacity: 0.85;
      }
    }
  `;

  return (
    <>
      <style>{keyframes}</style>
      <div style={styles.container}>
        <div style={styles.dotContainer}>
          <div style={styles.dot} />
          <div style={styles.pulse} />
          <div style={styles.pulse2} />
          <div style={styles.pulse3} />
        </div>
        <span style={styles.label}>LIVE</span>
      </div>
    </>
  );
}

export default LiveIndicator;
