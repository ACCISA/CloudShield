import React from "react";
import { useThemeColors } from "../../hooks/useThemeColors.js";
import CloudshieldIcon from "../../assets/CloudshieldIcon.jsx";
import "../../pages/auth.css";

export default function AuthCard({ children }) {
  const { isDark } = useThemeColors();
  return (
    <div className="auth-card auth-card--login">
      <CloudshieldIcon
        className="auth-card__logo"
        width={46}
        height={46}
        shieldFill={isDark ? "white" : "#111827"}
        iconFill={isDark ? "black" : "white"}
      />
      <h2 className="auth-card__title">Welcome back</h2>
      <p className="auth-card__subtitle">Sign in to your CloudShield account</p>
      <div className="auth-card__body">{children}</div>
    </div>
  );
}
