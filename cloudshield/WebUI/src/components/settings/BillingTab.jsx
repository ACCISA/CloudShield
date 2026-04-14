import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { useThemeColors } from "../../hooks/useThemeColors.js";
import SearchField from "../common/SearchField/SearchField.jsx";
import FilterButton from "../common/FilterButton/FilterButton.jsx";
import Pagination from "../common/Pagination/Pagination.jsx";
import Checkbox from "../common/Checkbox/Checkbox.jsx";
import { createFilterChangeHandler } from "../../utils/filterHelpers.js";
import { BILLING_FILTERS } from "../../config/filterConfigs.js";

const API_BASE_URL = "http://localhost:5050";

const BYPASS_STRIPE =
  import.meta.env.VITE_BYPASS_STRIPE_CONFIRMATION === "true";

const PLAN_OPTIONS = [
  {
    id: "basic",
    name: "Beginner",
    price: 29,
    priceId: "price_1T3VQLA5QKTufQ3cLmrB5VTV",
    description: "Perfect for small teams exploring AI security.",
    features: ["5 Workstations", "10 Users", "Standard NLP", "Email Support"],
  },
  {
    id: "pro",
    name: "Professional",
    price: 59,
    priceId: "price_1T3VQrA5QKTufQ3cRB80WIPb",
    description: "For growing businesses needing advanced protection.",
    features: [
      "20 Workstations",
      "50 Users",
      "Enhanced NLP",
      "Priority Support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 89,
    priceId: "price_1T3VRDA5QKTufQ3csurJvjpn",
    description: "Designed for large scale enterprise infrastructure.",
    features: ["100 Workstations", "500 Users", "Premium NLP", "24/7 Support"],
  },
];

function BillingDisabled() {
  const themeColors = useThemeColors();
  return (
    <div style={{ paddingBottom: 32 }}>
      <div style={{ marginBottom: 32 }}>
        <p
          style={{
            color: themeColors.textPrimary,
            fontWeight: 700,
            fontSize: "1.3rem",
            margin: "0 0 4px 0",
          }}
        >
          Billing Centre
        </p>
        <p
          style={{
            color: themeColors.textSecondary,
            fontSize: "0.9rem",
            margin: 0,
          }}
        >
          Manage your plan and billing details
        </p>
      </div>
      <div
        style={{
          padding: 32,
          borderRadius: "16px",
          border: "1px dashed rgba(250, 204, 21, 0.3)",
          backgroundColor: "rgba(250, 204, 21, 0.04)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          textAlign: "center",
        }}
      >
        <p
          style={{
            color: "#facc15",
            fontWeight: 700,
            fontSize: "1rem",
            margin: 0,
          }}
        >
          Billing is disabled
        </p>
        <p
          style={{
            color: themeColors.textSecondary,
            fontSize: "0.875rem",
            maxWidth: 480,
            margin: 0,
          }}
        >
          Stripe integration is currently bypassed (
          <code style={{ color: "rgba(255,255,255,0.6)" }}>
            VITE_BYPASS_STRIPE_CONFIRMATION=true
          </code>
          ). Set it to{" "}
          <code style={{ color: "rgba(255,255,255,0.6)" }}>false</code> and
          configure your Stripe keys and webhook to enable billing.
        </p>
      </div>
    </div>
  );
}

export default function BillingTab() {
  const themeColors = useThemeColors();
  const { user, refreshUser } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const orgId = localStorage.getItem("org_id");

  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState({ status: new Set() });
  const [selectedInvoices, setSelectedInvoices] = useState(new Set());
  const itemsPerPage = 5;

  const fetchData = async () => {
    try {
      const [invRes, cardRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/billing/invoices/${orgId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("jwt")}` },
        }),
        fetch(`${API_BASE_URL}/api/billing/payment-method/${orgId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("jwt")}` },
        }),
      ]);
      const invData = await invRes.json();
      const cardData = await cardRes.json();

      setInvoices(Array.isArray(invData) ? invData : []);
      if (!cardData.error) setCard(cardData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleFocus = () => {
      if (refreshUser) refreshUser();
      fetchData();
    };
    window.addEventListener("focus", handleFocus);

    const params = new URLSearchParams(window.location.search);
    if (params.get("status") === "success") {
      setIsSyncing(true);
      window.history.replaceState({}, document.title, window.location.pathname);

      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        await fetchData();
        if (attempts >= 5) {
          clearInterval(pollInterval);
          setIsSyncing(false);
        }
      }, 3000);
    } else {
      if (orgId) fetchData();
    }

    return () => window.removeEventListener("focus", handleFocus);
  }, [orgId, refreshUser]);

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/billing/create-portal-session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("jwt")}`,
          },
          body: JSON.stringify({ org_id: orgId }),
        },
      );
      const data = await response.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error(err);
    } finally {
      setPortalLoading(false);
    }
  };

  const handleFilterChange = createFilterChangeHandler(setActiveFilters);

  const filteredInvoices = useMemo(() => {
    let result = invoices;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (inv) =>
          (inv.plan || "").toLowerCase().includes(q) ||
          (inv.amount || "").toLowerCase().includes(q) ||
          (inv.date || "").toLowerCase().includes(q),
      );
    }
    if (activeFilters.status?.size > 0) {
      result = result.filter((inv) =>
        activeFilters.status.has((inv.status || "paid").toLowerCase()),
      );
    }
    return result;
  }, [invoices, searchQuery, activeFilters]);

  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredInvoices.slice(start, start + itemsPerPage);
  }, [filteredInvoices, currentPage]);

  const allInvoicesSelected =
    paginatedInvoices.length > 0 &&
    paginatedInvoices.every((inv) => selectedInvoices.has(inv.id));
  const isInvoiceIndeterminate =
    !allInvoicesSelected &&
    paginatedInvoices.some((inv) => selectedInvoices.has(inv.id));

  const handleToggleSelectAll = () => {
    if (selectedInvoices.size > 0) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(paginatedInvoices.map((inv) => inv.id)));
    }
  };

  const handleToggleSelect = (id) => {
    const next = new Set(selectedInvoices);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedInvoices(next);
  };

  const activePackage = card?.package || user?.package || "basic";
  const subStatus = card?.sub_status || "active";
  const cancelDate = card?.cancel_at_date
    ? new Date(card.cancel_at_date).toLocaleDateString()
    : null;
  const currentPlan =
    PLAN_OPTIONS.find((p) => p.id === activePackage) || PLAN_OPTIONS[0];
  if (BYPASS_STRIPE) return <BillingDisabled />;

  return (
    <div style={{ paddingBottom: 48 }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .billing-upgrade-btn:hover { opacity: 0.88; }
        .billing-cancel-link:hover { opacity: 1 !important; }
        .billing-edit-btn:hover { opacity: 0.82; }
        .billing-download-btn:hover { color: var(--text-primary) !important; }
        .billing-invoice-row:hover { background: ${themeColors.lightOverlay} !important; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <p style={{ color: themeColors.textPrimary, fontWeight: 700, fontSize: "1.45rem", margin: "0 0 6px 0", letterSpacing: "-0.3px" }}>
          Billing
        </p>
        <p style={{ color: themeColors.textSecondary, fontSize: "0.9rem", margin: 0, lineHeight: 1.5 }}>
          Manage your plan and payment details
        </p>
      </div>

      {/* Two-column card row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 40 }}>

        {/* Plan card */}
        <div
          style={{
            padding: "32px 28px",
            backgroundColor: themeColors.surface,
            borderRadius: "20px",
            border: `1px solid ${themeColors.borderLight}`,
            display: "flex",
            flexDirection: "column",
            position: "relative",
            overflow: "hidden",
            gap: 0,
          }}
        >
          {isSyncing && (
            <div
              style={{
                position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: themeColors.surface,
                opacity: 0.96,
                zIndex: 10,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                backdropFilter: "blur(4px)",
                gap: 14,
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill={themeColors.textSecondary} style={{ animation: "spin 1.4s linear infinite" }}>
                <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
              </svg>
              <p style={{ color: themeColors.textPrimary, fontWeight: 600, fontSize: "0.95rem", margin: 0 }}>
                Syncing with Stripe…
              </p>
            </div>
          )}

          {/* Plan name + badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ color: themeColors.textPrimary, fontWeight: 700, fontSize: "1.05rem", letterSpacing: "-0.2px" }}>
              {currentPlan.name} plan
            </span>
            <span
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                letterSpacing: "0.4px",
                textTransform: "uppercase",
                padding: "3px 9px",
                borderRadius: "20px",
                backgroundColor: subStatus === "canceled" ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
                color: subStatus === "canceled" ? "#ef4444" : "#16a34a",
                border: subStatus === "canceled" ? "1px solid rgba(239,68,68,0.2)" : "1px solid rgba(34,197,94,0.2)",
              }}
            >
              {subStatus === "canceled" ? "Canceled" : "Active"}
            </span>
          </div>

          {/* Description */}
          {subStatus === "canceled" ? (
            <p style={{ color: "#ef4444", fontSize: "0.85rem", lineHeight: 1.6, fontWeight: 500, margin: "0 0 28px 0" }}>
              Access remains until {cancelDate || "end of billing period"}. Upgrade to reactivate.
            </p>
          ) : (
            <p style={{ color: themeColors.textSecondary, fontSize: "0.875rem", lineHeight: 1.6, margin: "0 0 28px 0" }}>
              {currentPlan.description}
            </p>
          )}

          {/* Price + actions */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: "auto" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ color: themeColors.textPrimary, fontWeight: 800, fontSize: "2.4rem", lineHeight: 1, letterSpacing: "-1px" }}>
                ${currentPlan.price}
              </span>
              <span style={{ fontSize: "0.85rem", color: themeColors.textSecondary, fontWeight: 500, marginLeft: 2 }}>
                / mo
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
              <button
                className="billing-upgrade-btn"
                onClick={handleManageBilling}
                disabled={portalLoading}
                style={{
                  backgroundColor: themeColors.textPrimary,
                  color: themeColors.bgPrimary,
                  borderRadius: "12px",
                  padding: "10px 22px",
                  border: "none",
                  fontWeight: 700,
                  cursor: portalLoading ? "not-allowed" : "pointer",
                  fontSize: "0.875rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  transition: "opacity 0.15s",
                  letterSpacing: "-0.1px",
                }}
              >
                {subStatus === "canceled" ? "Reactivate" : "Upgrade plan"}
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>

              {subStatus !== "canceled" && (
                <button
                  className="billing-cancel-link"
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                  style={{
                    cursor: portalLoading ? "not-allowed" : "pointer",
                    fontSize: "0.78rem",
                    color: themeColors.textSecondary,
                    fontWeight: 500,
                    userSelect: "none",
                    opacity: 0.65,
                    transition: "opacity 0.15s",
                    background: "none",
                    border: "none",
                    padding: 0,
                  }}
                >
                  {portalLoading ? "Loading…" : "Cancel subscription"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Payment method card */}
        <div
          style={{
            padding: "32px 28px",
            backgroundColor: themeColors.surface,
            borderRadius: "20px",
            border: `1px solid ${themeColors.borderLight}`,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <p style={{ color: themeColors.textPrimary, fontWeight: 700, fontSize: "1.05rem", letterSpacing: "-0.2px", margin: "0 0 6px 0" }}>
            Payment method
          </p>
          <p style={{ color: themeColors.textSecondary, fontSize: "0.875rem", margin: "0 0 24px 0", lineHeight: 1.5 }}>
            Change how you pay for your plan
          </p>

          <div
            style={{
              padding: "18px 20px",
              borderRadius: "14px",
              border: `1px solid ${themeColors.borderLight}`,
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: themeColors.bgPrimary,
              marginTop: "auto",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  color: themeColors.textSecondary,
                  backgroundColor: themeColors.lightOverlay,
                  padding: "9px",
                  borderRadius: "10px",
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
                </svg>
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ color: themeColors.textPrimary, fontWeight: 600, fontSize: "0.925rem" }}>
                    {card && card.brand ? `•••• ${card.last4}` : "No card on file"}
                  </span>
                  {card && card.brand && (
                    <span style={{
                      fontSize: "0.62rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.4px",
                      backgroundColor: themeColors.lightOverlay,
                      color: themeColors.textSecondary,
                      padding: "2px 7px",
                      borderRadius: "20px",
                    }}>
                      Default
                    </span>
                  )}
                </div>
                <p style={{ color: themeColors.textSecondary, fontSize: "0.78rem", margin: 0 }}>
                  {card && card.brand
                    ? `Expires ${card.exp_month}/${card.exp_year}`
                    : "Update in billing portal"}
                </p>
              </div>
            </div>

            <button
              className="billing-edit-btn"
              onClick={handleManageBilling}
              disabled={portalLoading}
              style={{
                height: 36,
                minWidth: 64,
                color: themeColors.bgPrimary,
                backgroundColor: themeColors.textPrimary,
                borderRadius: "10px",
                border: "none",
                fontWeight: 700,
                padding: "0 18px",
                cursor: portalLoading ? "not-allowed" : "pointer",
                fontSize: "0.85rem",
                transition: "opacity 0.15s",
                letterSpacing: "-0.1px",
              }}
            >
              {portalLoading ? "…" : "Edit"}
            </button>
          </div>
        </div>
      </div>

      {/* Billing History */}
      <div
        style={{
          backgroundColor: themeColors.surface,
          border: `1px solid ${themeColors.borderLight}`,
          borderRadius: "20px",
          overflow: "hidden",
          marginBottom: 16,
        }}
      >
        {/* Toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "22px 24px 16px",
            borderBottom: `1px solid ${themeColors.borderLight}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: themeColors.textPrimary, fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.2px" }}>
              Billing history
            </span>
            <span
              style={{
                backgroundColor: themeColors.lightOverlay,
                color: themeColors.textSecondary,
                fontSize: "0.75rem",
                fontWeight: 600,
                padding: "2px 9px",
                borderRadius: "20px",
              }}
            >
              {filteredInvoices.length}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <SearchField
              placeholder="Search invoices"
              value={searchQuery}
              onChange={(val) => {
                setSearchQuery(val);
                setCurrentPage(1);
              }}
              width="220px"
            />
            <FilterButton
              filterGroups={BILLING_FILTERS}
              activeFilters={activeFilters}
              onFilterChange={handleFilterChange}
            />
          </div>
        </div>

        {/* Column header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "40px 1fr 140px 180px 110px 44px",
            padding: "10px 24px",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Checkbox
              checked={allInvoicesSelected}
              indeterminate={isInvoiceIndeterminate}
              onChange={handleToggleSelectAll}
            />
          </div>
          {["Invoice", "Amount", "Date", "Status", ""].map((h) => (
            <span
              key={h}
              style={{
                color: themeColors.textSecondary,
                fontSize: "0.72rem",
                fontWeight: 600,
                letterSpacing: "0.6px",
                textTransform: "uppercase",
              }}
            >
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 200 }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={themeColors.textSecondary} strokeWidth="2" style={{ animation: "spin 1s linear infinite", opacity: 0.5 }}>
                <circle cx="12" cy="12" r="10" opacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
              </svg>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 200, gap: 6 }}>
              <span style={{ color: themeColors.textPrimary, fontSize: "0.95rem", fontWeight: 600 }}>
                {invoices.length === 0 ? "No invoices yet" : "No results"}
              </span>
              <span style={{ color: themeColors.textSecondary, fontSize: "0.85rem" }}>
                {invoices.length === 0 ? "Your billing history will appear here" : "Try adjusting your search or filters"}
              </span>
            </div>
          ) : (
            paginatedInvoices.map((inv) => (
              <div
                key={inv.id}
                className="billing-invoice-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "40px 1fr 140px 180px 110px 44px",
                  padding: "14px 24px",
                  alignItems: "center",
                  borderTop: `1px solid ${themeColors.borderLight}`,
                  transition: "background 0.12s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Checkbox
                    checked={selectedInvoices.has(inv.id)}
                    onChange={() => handleToggleSelect(inv.id)}
                  />
                </div>
                <span style={{ color: themeColors.textPrimary, fontSize: "0.875rem", fontWeight: 500 }}>
                  {inv.plan}
                </span>
                <span style={{ color: themeColors.textPrimary, fontSize: "0.875rem", fontWeight: 600 }}>
                  {inv.amount}
                </span>
                <span style={{ color: themeColors.textSecondary, fontSize: "0.85rem" }}>
                  {inv.date}
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    backgroundColor: "rgba(34,197,94,0.08)",
                    color: "#16a34a",
                    fontWeight: 600,
                    border: "1px solid rgba(34,197,94,0.18)",
                    borderRadius: "20px",
                    padding: "3px 10px",
                    fontSize: "0.72rem",
                    letterSpacing: "0.2px",
                    width: "fit-content",
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                  Paid
                </span>
                <button
                  className="billing-download-btn"
                  onClick={() => window.open(inv.url, "_blank", "noopener,noreferrer")}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: themeColors.textSecondary,
                    padding: 4,
                    display: "flex",
                    alignItems: "center",
                    transition: "color 0.15s",
                    opacity: 0.6,
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>

        <div style={{ padding: "12px 24px", borderTop: `1px solid ${themeColors.borderLight}` }}>
          <Pagination
            totalItems={filteredInvoices.length}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            itemLabel="invoices"
          />
        </div>
      </div>
    </div>
  );
}
