import React from "react";
import { useThemeColors } from "../../hooks/useThemeColors.js";
import "../../pages/auth.css";

export default function SignupCard({ children }) {
  const { isDark } = useThemeColors();
  return (
    <div className="auth-card">
      <img
        className="auth-card__logo"
        src={
          isDark ? "/cloudshield_logo_white.png" : "/cloudshield_logo_black.png"
        }
        alt="CloudShield"
      />
      <div className="auth-card__body">{children}</div>
    </div>
  );
}
