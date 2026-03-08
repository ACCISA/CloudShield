import React, { useState, useEffect } from "react";
import { Box, Typography, Container, Grid, Button } from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { useOrgMetrics } from "../api/useOrgMetrics";
import SubscriptionPlanCard from "../components/subscription/PlanCard";
// CORRECTED PATH BASED ON TREE:
import BillingTab from "../components/settings/BillingTab"; 

const API_BASE_URL = "http://localhost:5050";

const PLAN_OPTIONS = [
  { id: "basic", name: "Beginner", price: 29, priceId: "price_1T3VQLA5QKTufQ3cLmrB5VTV", description: "Perfect for small teams exploring AI security.", features: ["5 Workstations", "10 Users", "Standard NLP", "Email Support"] },
  { id: "pro", name: "Professional", price: 59, tag: "Most Popular", priceId: "price_1T3VQrA5QKTufQ3cRB80WIPb", description: "For growing businesses needing advanced protection.", features: ["20 Workstations", "50 Users", "Enhanced NLP", "Priority Support"] },
  { id: "enterprise", name: "Enterprise", price: 89, priceId: "price_1T3VRDA5QKTufQ3csurJvjpn", description: "Designed for large scale enterprise infrastructure.", features: ["100 Workstations", "500 Users", "Premium NLP", "24/7 Support"] },
];

export default function SubscriptionPage() {
  const { user, refreshUser } = useAuth(); 
  const { stats } = useOrgMetrics();
  const [loadingId, setLoadingId] = useState(null);

  const orgId = localStorage.getItem("org_id");

  useEffect(() => {
    // If we land here with ?status=success, trigger the user refresh to pick up the new 'package'
    if (window.location.search.includes("status=success")) {
      if (refreshUser) refreshUser();
      // Clean the URL so refresh doesn't trigger infinitely
      window.history.replaceState({}, document.title, "/subscription");
    }
  }, [refreshUser]);

  const handleUpgrade = async (plan) => {
    setLoadingId(plan.id);
    try {
      const response = await fetch(`${API_BASE_URL}/api/billing/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("jwt")}` },
        body: JSON.stringify({ price_id: plan.priceId, org_id: orgId }),
      });
      const data = await response.json();
      if (data.url) window.location.href = data.url;
    } catch (err) { console.error(err); }
    setLoadingId(null);
  };

  const handleManageBilling = async () => {
    setLoadingId("portal");
    try {
      const response = await fetch(`${API_BASE_URL}/api/billing/create-portal-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("jwt")}` },
        body: JSON.stringify({ org_id: orgId }),
      });
      const data = await response.json();
      if (data.url) window.location.href = data.url;
    } catch (err) { console.error(err); }
    setLoadingId(null);
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#0A0A0A", py: 6 }}>
      <Container maxWidth="lg">
        {/* Unified Settings Header */}
        <Box sx={{ mb: 6, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <Box>
            <Typography variant="h3" sx={{ color: "#fff", fontWeight: 800, mb: 1 }}>Settings</Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: "1.1rem" }}>Manage your subscription and organization details.</Typography>
          </Box>
          <Button onClick={handleManageBilling} disabled={loadingId === "portal"} sx={{ color: "#4ade80", textTransform: "none", fontWeight: 700 }}>
            {loadingId === "portal" ? "Connecting..." : "Manage Billing & Invoices →"}
          </Button>
        </Box>

        {/* Plan Selection Section */}
        <Box sx={{ p: 4, borderRadius: "20px", bgcolor: "#111", border: "1px solid rgba(255,255,255,0.05)", mb: 6 }}>
          <Typography variant="h5" sx={{ color: "#fff", fontWeight: 700, mb: 4 }}>Plan Selection</Typography>
          <Grid container spacing={4}>
            {PLAN_OPTIONS.map((plan) => (
              <Grid item key={plan.id} xs={12} sm={6} md={4}>
                <SubscriptionPlanCard 
                  plan={plan} 
                  isCurrent={user?.package === plan.id} 
                  isLoading={loadingId === plan.id} 
                  onUpgrade={handleUpgrade} 
                />
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Dynamic Billing History Component */}
        <BillingTab />

        {/* Resource Allocation Summary */}
        <Box sx={{ mt: 6, p: 4, borderRadius: "20px", bgcolor: "#111", border: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box>
            <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", textTransform: "uppercase", fontWeight: 700, mb: 1 }}>Resource Allocation</Typography>
            <Typography variant="h5" sx={{ color: "#fff", fontWeight: 700 }}>
              {stats.workstations || 0} / <span style={{ color: "#4ade80" }}>{user?.workstation_limit || 5}</span> Workstations Active
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}