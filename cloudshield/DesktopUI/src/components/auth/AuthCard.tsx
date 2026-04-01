import type { PropsWithChildren } from "react";
import Logo from "../../assets/cloudShieldLogo.svg";
import "../../pages/auth.css";

export default function AuthCard({ children }: PropsWithChildren) {
  return (
    <div className="auth-card auth-card--login">
      <img className="auth-card__logo" src={Logo} alt="CloudShield" />
      <h2 className="auth-card__title">Welcome back</h2>
      <p className="auth-card__subtitle">Sign in to your CloudShield account</p>
      <div className="auth-card__body">{children}</div>
    </div>
  );
}
