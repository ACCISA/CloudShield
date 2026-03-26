import React from "react";
import { useThemeColors } from "../../hooks/useThemeColors.js";
import "../../pages/auth.css";

export default function AuthCard({ children }) {
  const { isDark } = useThemeColors();
  return (
    <div className="auth-card auth-card--login">
      <img
        className="auth-card__logo"
        src={isDark ? "/cloudshield_logo_white.png" : "/cloudshield_logo_black.png"}
        alt="CloudShield"
      />
      <h2 className="auth-card__title">Welcome back</h2>
      <p className="auth-card__subtitle">Sign in to your CloudShield account</p>
      <div className="auth-card__body">{children}</div>
    </div>
  );
}
