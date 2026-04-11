import React from "react";
import { useThemeColors } from "../../hooks/useThemeColors.js";
import CloudshieldIcon from "../../assets/CloudshieldIcon.jsx";
import "../../pages/auth.css";

export default function SignupCard({ children }) {
  const { isDark } = useThemeColors();
  return (
    <div className="auth-card">
      <CloudshieldIcon
        className="auth-card__logo"
        width={46}
        height={46}
        shieldFill={isDark ? "white" : "#111827"}
        iconFill={isDark ? "black" : "white"}
      />
      <div className="auth-card__body">{children}</div>
    </div>
  );
}
