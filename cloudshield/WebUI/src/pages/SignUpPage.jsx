import React, { useState } from "react";
import { Box, Typography } from "@mui/material";

import SignupCard from "../components/signup/SignupCard.jsx";
import PlanCard from "../components/signup/PlanCard.jsx";
import AuthTextField from "../components/auth/AuthTextField.jsx";
import PasswordField from "../components/auth/PasswordField.jsx";
import PrimaryButton from "../components/auth/PrimaryButton.jsx";

// to e updated later with real plans
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

export default function SignupPage({ onSignupSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [orgId, setOrgId] = useState("");
  const [plan, setPlan] = useState("pro");

  const [errors, setErrors] = useState({});

  const validate = () => {
    const next = {};

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      next.email = "Invalid email format.";
    }

    if (password.length < 6) {
      next.password = "Password must be at least 6 characters.";
    }

    if (!company.trim()) {
      next.company = "Company name is required.";
    }

    if (!orgId.match(/^[a-z0-9]{3,32}$/)) {
      next.orgId =
        "Org ID must be 3-32 characters, lowercase letters and digits only.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // andrew signup here
  const handleSignup = () => {
    if (!validate()) return;

    console.log("Creating org:", { email, password, company, orgId, plan });
    if (onSignupSuccess) onSignupSuccess();
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

            <AuthTextField
              label="Email"
              placeholder="jane@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {errors.email && (
              <Typography sx={{ color: "#f87171", mb: 1.5, fontSize: "0.85rem" }}>
                {errors.email}
              </Typography>
            )}

            <PasswordField
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {errors.password && (
              <Typography sx={{ color: "#f87171", mb: 1.5, fontSize: "0.85rem" }}>
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
              <Typography sx={{ color: "#f87171", mb: 1.5, fontSize: "0.85rem" }}>
                {errors.company}
              </Typography>
            )}

            <AuthTextField
              label="Organization ID"
              placeholder="acme"
              value={orgId}
              onChange={(e) =>
                setOrgId(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))
              }
            />
            {errors.orgId && (
              <Typography sx={{ color: "#f87171", mb: 1.5, fontSize: "0.85rem" }}>
                {errors.orgId}
              </Typography>
            )}

            <PrimaryButton onClick={handleSignup}>
              Create Organization
            </PrimaryButton>
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
                onSelect={setPlan}
              />
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}