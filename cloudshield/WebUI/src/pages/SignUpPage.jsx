import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { trackButton } from "../lib/analytics";

import { getUserErrorMessage } from "../lib/errors";

import SignupCard from "../components/signup/SignupCard.jsx";
import PlanCard from "../components/signup/PlanCard.jsx";
import AuthTextField from "../components/auth/AuthTextField.jsx";
import PasswordField from "../components/auth/PasswordField.jsx";
import PrimaryButton from "../components/auth/PrimaryButton.jsx";

import { apiPost } from "../api/client";
import "./auth.css";

// to be updated later with real plans
const PLAN_OPTIONS = [
  {
    id: "basic",
    priceId: "price_1T3VQLA5QKTufQ3cLmrB5VTV",
    name: "Beginner",
    price: 29,
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
    priceId: "price_1T3VQrA5QKTufQ3cRB80WIPb",
    name: "Professional",
    price: 59,
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
    priceId: "price_1T3VRDA5QKTufQ3csurJvjpn",
    name: "Enterprise",
    price: 89,
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

const BYPASS_STRIPE =
  import.meta?.env?.VITE_BYPASS_STRIPE_CONFIRMATION === "true";

const EMAIL_MAX_LENGTH = 254;
const PASSWORD_REQUIREMENTS_MESSAGE =
  "Password must be 12+ characters and include uppercase, lowercase, numbers, and symbols.";

function isEmailValid(raw) {
  if (!raw) return false;
  const email = String(raw).trim();
  if (email.length === 0 || email.length > EMAIL_MAX_LENGTH) return false;

  const atIndex = email.indexOf("@");
  const lastAtIndex = email.lastIndexOf("@");
  if (atIndex <= 0 || atIndex !== lastAtIndex || atIndex === email.length - 1) {
    return false;
  }

  const domain = email.slice(atIndex + 1);
  const lastDotIndex = domain.lastIndexOf(".");
  if (lastDotIndex <= 0 || lastDotIndex === domain.length - 1) {
    return false;
  }

  return true;
}

function extractServerErrors(res, data) {
  if (res.status === 400) {
    if (data.errors && typeof data.errors === "object") return data.errors;
    return {
      form: data.message || "Validation error. Please check your inputs.",
    };
  }

  if (res.status === 409) {
    return {
      form:
        data.message ||
        "An account with this email or organization ID already exists.",
    };
  }

  if (!res.ok) {
    return {
      form: data.message || "Unexpected error during signup. Please try again.",
    };
  }

  return null;
}

export default function SignupPage({ onSignupSuccess }) {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminName, setAdminName] = useState("");
  const [company, setCompany] = useState("");
  const [plan, setPlan] = useState("pro");

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handlePlanSelect = (id) => {
    trackButton("signup/plan/select", { page: "signup", plan: id });
    setPlan(id);
  };

  const submitLabel = (() => {
    if (!submitting) return "Create Organization";
    if (BYPASS_STRIPE) return "Creating...";
    return "Redirecting to payment...";
  })();

  const validate = () => {
    const next = {};
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{12,128}$/;

    if (!isEmailValid(email)) next.email = "Invalid email format.";
    if (!passwordRegex.test(password)) {
      next.password = PASSWORD_REQUIREMENTS_MESSAGE;
    }
    if (!adminName.trim()) next.adminName = "Admin name is required.";
    if (!company.trim()) next.company = "Company name is required.";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const safeSetItem = (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch (err) {
      console.warn("localStorage.setItem failed", key, err);
    }
  };

  const handleSignup = async () => {
    if (!validate()) return;

    setSubmitting(true);
    setErrors((prev) => ({ ...prev, form: undefined }));
    trackButton("signup/submit", { page: "signup", plan });

    try {
      // 1. Create the User and Organization in MongoDB
      const createUserRes = await apiPost("/auth/signup", {
        email: email,
        password: password,
        full_name: adminName,
        company_name: company,
        package_type: plan,
      });

      let createUserData = {};
      try {
        createUserData = await createUserRes.json();
      } catch (err) {
        console.error("Could not parse JSON response", err);
      }
      console.log(createUserRes);
      const createUserErrors = extractServerErrors(
        createUserRes,
        createUserData,
      );
      if (createUserErrors) {
        setErrors((prev) => ({ ...prev, ...createUserErrors }));
        return;
      }

      if (!createUserData.user_id || !createUserData.org_id) {
        setErrors((prev) => ({
          ...prev,
          form: "Unexpected error during signup. Please try again.",
        }));
        return;
      }

      const userData = {
        email,
        user_id: createUserData.user_id,
        org_id: createUserData.org_id,
        company_name: company,
        plan,
        job_id: createUserData.job_id,
      };

      safeSetItem("user", JSON.stringify(userData));
      if (createUserData.access_token) {
        safeSetItem("jwt", createUserData.access_token);
      }
      if (createUserData.job_id) {
        safeSetItem("provision_job_id", createUserData.job_id);
      }
      if (createUserData.org_id) {
        safeSetItem("org_id", createUserData.org_id);
      }

      onSignupSuccess?.({
        access_token: createUserData.access_token || null,
        user: userData,
      });

      if (BYPASS_STRIPE) {
        navigate("/provisioning", { replace: true });
        return;
      }

      const selectedPlan =
        PLAN_OPTIONS.find((p) => p.id === plan) || PLAN_OPTIONS[0];

      const checkoutRes = await fetch("/api/billing/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${createUserData.access_token}`,
        },
        body: JSON.stringify({
          price_id: selectedPlan.priceId,
          org_id: createUserData.org_id,
          success_path: "/provisioning",
          cancel_path: "/signup",
        }),
      });

      let checkoutData = {};
      try {
        checkoutData = await checkoutRes.json();
      } catch (err) {
        console.error("Could not parse checkout JSON response", err);
      }

      if (checkoutData.url) {
        globalThis.location.href = checkoutData.url;
      } else {
        navigate("/provisioning", { replace: true });
      }
    } catch (err) {
      setErrors((prev) => ({ ...prev, form: getUserErrorMessage(err) }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-inner">
        {/* ── Left: form ── */}
        <div className="signup-form-col">
          <SignupCard>
            <h2 className="auth-card__title">Create Your Organization</h2>

            {BYPASS_STRIPE && (
              <div className="signup-bypass-banner">
                Billing disabled — VITE_BYPASS_STRIPE_CONFIRMATION=true
              </div>
            )}

            {errors.form && <div className="auth-error">{errors.form}</div>}

            <AuthTextField
              label="Email"
              placeholder="jane@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {errors.email && <p className="auth-field-error">{errors.email}</p>}

            <PasswordField
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {errors.password && (
              <p className="auth-field-error">{errors.password}</p>
            )}

            <AuthTextField
              label="Admin Name"
              placeholder="Jane Doe"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
            />
            {errors.adminName && (
              <p className="auth-field-error">{errors.adminName}</p>
            )}

            <AuthTextField
              label="Company Name"
              placeholder="Acme Corp"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
            {errors.company && (
              <p className="auth-field-error">{errors.company}</p>
            )}

            <PrimaryButton onClick={handleSignup} disabled={submitting}>
              {submitLabel}
            </PrimaryButton>

            <button
              type="button"
              className="auth-nav-link"
              onClick={() => {
                trackButton("signup/nav/login", { page: "signup" });
                navigate("/login");
              }}
            >
              Already have an account? Log in
            </button>
          </SignupCard>
        </div>

        {/* ── Right: plan selection ── */}
        <div className="signup-plans-col">
          <h2 className="signup-plans-title">Your Plan Overview</h2>
          <div
            className="signup-plans-grid"
            style={{
              opacity: submitting ? 0.7 : 1,
              pointerEvents: submitting ? "none" : "auto",
            }}
          >
            {PLAN_OPTIONS.map((p) => (
              <PlanCard
                key={p.id}
                plan={p}
                selected={plan === p.id}
                onSelect={handlePlanSelect}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

SignupPage.propTypes = {
  onSignupSuccess: PropTypes.func,
};
