import React, { useState } from "react";
import { Box, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { trackButton } from "../lib/analytics";

import SignupCard from "../components/signup/SignupCard.jsx";
import PlanCard from "../components/signup/PlanCard.jsx";
import AuthTextField from "../components/auth/AuthTextField.jsx";
import PasswordField from "../components/auth/PasswordField.jsx";
import PrimaryButton from "../components/auth/PrimaryButton.jsx";

// to be updated later with real plans
const PLAN_OPTIONS = [
  {
    id: "basic",
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

// ------------------------------
// Validation / security constants
// ------------------------------
const EMAIL_MAX_LENGTH = 254; // typical upper bound

const PASSWORD_MIN_LENGTH = 12; // Match the backend requirement
const PASSWORD_REQUIREMENTS_MESSAGE =
  "Password must be 12+ characters and include uppercase, lowercase, numbers, and symbols.";

// Simple structural email validation without regex
function isEmailValid(raw) {
  if (!raw) return false;

  const email = String(raw).trim();

  if (email.length === 0 || email.length > EMAIL_MAX_LENGTH) {
    return false;
  }

  const atIndex = email.indexOf("@");
  const lastAtIndex = email.lastIndexOf("@");

  // must contain exactly one "@", not at start or end
  if (atIndex <= 0 || atIndex !== lastAtIndex || atIndex === email.length - 1) {
    return false;
  }

  const domain = email.slice(atIndex + 1);
  const lastDotIndex = domain.lastIndexOf(".");

  // domain must contain a dot not at start or end
  if (lastDotIndex <= 0 || lastDotIndex === domain.length - 1) {
    return false;
  }

  return true;
}

export default function SignupPage({ onSignupSuccess }) {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [plan, setPlan] = useState("pro");

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handlePlanSelect = (id) => {
    trackButton("signup/plan/select", { page: "signup", plan: id });
    setPlan(id);
  };

  const validate = () => {
    const next = {};

    // Complexity regex to match your Python PASSWORD_RX
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{12,128}$/;

    if (!isEmailValid(email)) {
      next.email = "Invalid email format.";
    }

    if (!passwordRegex.test(password)) {
      next.password = PASSWORD_REQUIREMENTS_MESSAGE;
    }

    if (!company.trim()) {
      next.company = "Company name is required.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  function extractServerErrors(res, data) {
    if (res.status === 400) {
      if (data.errors && typeof data.errors === "object") {
        return data.errors;
      }
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
        form:
          data.message || "Unexpected error during signup. Please try again.",
      };
    }

    return null;
  }

  const handleSignup = async () => {
    if (!validate()) return;

    setSubmitting(true);
    setErrors((prev) => ({ ...prev, form: undefined }));

    trackButton("signup/submit", { page: "signup", plan });

    try {
      // 1. Create the User and Organization in MongoDB
      const createUserRes = await fetch(
        "/api/auth/signup",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            full_name: company,
            company_name: company,
            package_type: plan,
          }),
        }
      );

      let createUserData = {};
      try {
        createUserData = await createUserRes.json();
      } catch (err) {
        console.error("Could not parse JSON response", err);
      }

      const createUserErrors = extractServerErrors(createUserRes, createUserData);
      if (createUserErrors) {
        setErrors((prev) => ({ ...prev, ...createUserErrors }));
        return;
      }

      const userData = {
        email: email,
        user_id: createUserData.user_id,
        org_id: createUserData.org_id,
        company_name: company,
        plan: plan,
        job_id: createUserData.job_id,
      };

      localStorage.setItem("user", JSON.stringify(userData));
      if (createUserData.access_token) {
        localStorage.setItem("jwt", createUserData.access_token);
      }
      if (createUserData.job_id) {
        localStorage.setItem("provision_job_id", createUserData.job_id);
      }
      if (createUserData.org_id) {
        localStorage.setItem("org_id", createUserData.org_id);
      }

      onSignupSuccess?.({
        access_token: createUserData.access_token || null,
        user: userData,
      });

      // --- REDIRECT TO DASHBOARD ---
      console.log("Signup successful, navigating to provisioning...");
      navigate("/provisioning", { replace: true });
    } catch (err) {
      console.error("Signup error:", err);
      setErrors((prev) => ({
        ...prev,
        form: "Error during signup. Is the server running?",
      }));
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#0A0A0A",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: { xs: 2, md: 4, lg: 6 },
        py: { xs: 3, md: 4 },
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 1240,
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: { xs: 3, md: 5 },
        }}
      >
        <Box
          sx={{
            flex: { xs: "1 1 auto", md: "0 0 360px" },
            display: "flex",
            alignItems: "center",
          }}
        >
          <SignupCard>
            <Typography
              sx={{
                fontSize: "1.6rem",
                fontWeight: 700,
                textAlign: "center",
                mb: 2.5,
              }}
            >
              Create Your Organization
            </Typography>

            {errors.form && (
              <Typography
                sx={{
                  color: "#f87171",
                  mb: 1.5,
                  fontSize: "0.9rem",
                  textAlign: "center",
                }}
              >
                {errors.form}
              </Typography>
            )}

            <AuthTextField
              label="Email"
              placeholder="jane@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {errors.email && (
              <Typography
                sx={{ color: "#f87171", mb: 1.5, fontSize: "0.85rem" }}
              >
                {errors.email}
              </Typography>
            )}

            <PasswordField
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {errors.password && (
              <Typography
                sx={{ color: "#f87171", mb: 1.5, fontSize: "0.85rem" }}
              >
                {errors.password}
              </Typography>
            )}

            <AuthTextField
              label="Company Name"
              placeholder="Acme Corp"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
            {errors.company && (
              <Typography
                sx={{ color: "#f87171", mb: 1.5, fontSize: "0.85rem" }}
              >
                {errors.company}
              </Typography>
            )}

            <PrimaryButton onClick={handleSignup} disabled={submitting}>
              {submitting ? "Creating..." : "Create Organization"}
            </PrimaryButton>

            <Typography
              onClick={() => {
                trackButton("signup/nav/login", { page: "signup" });
                navigate("/login");
              }}
              sx={{
                cursor: "pointer",
                mt: 1.5,
                textAlign: "center",
                color: "#ffffffff",
                fontSize: "0.9rem",
                "&:hover": {
                  textDecoration: "underline",
                  color: "#93c5fd",
                },
              }}
            >
              Already have an account? Log in
            </Typography>
          </SignupCard>
        </Box>

        <Box sx={{ flex: "1 1 0", minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: "1.9rem",
              fontWeight: 700,
              color: "#ffffff",
              mb: 2.5,
              textAlign: { xs: "center", md: "left" },
            }}
          >
            Your Plan Overview
          </Typography>

          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 2.5,
              justifyContent: { xs: "center", md: "flex-start" },
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
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

SignupPage.propTypes = {
  onSignupSuccess: PropTypes.func,
};
