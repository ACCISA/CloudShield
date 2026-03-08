import React, { useState, useEffect } from "react";
import {
  Box, Typography, TextField, Button, Checkbox, Chip,
  InputAdornment, IconButton, CircularProgress, Grid, Paper,
  TablePagination
} from "@mui/material";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import FilterListOutlinedIcon from "@mui/icons-material/FilterListOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import NorthEastIcon from "@mui/icons-material/NorthEast";
import CheckIcon from "@mui/icons-material/Check";
import CreditCardOutlinedIcon from "@mui/icons-material/CreditCardOutlined";
import SyncIcon from "@mui/icons-material/Sync";
import { useAuth } from "../../context/AuthContext";

const API_BASE_URL = "http://localhost:5050";

const BYPASS_STRIPE = import.meta.env.VITE_BYPASS_STRIPE_CONFIRMATION === "false";

const PLAN_OPTIONS = [
  { id: "basic", name: "Beginner", price: 29, priceId: "price_1T3VQLA5QKTufQ3cLmrB5VTV", description: "Perfect for small teams exploring AI security.", features: ["5 Workstations", "10 Users", "Standard NLP", "Email Support"] },
  { id: "pro", name: "Professional", price: 59, priceId: "price_1T3VQrA5QKTufQ3cRB80WIPb", description: "For growing businesses needing advanced protection.", features: ["20 Workstations", "50 Users", "Enhanced NLP", "Priority Support"] },
  { id: "enterprise", name: "Enterprise", price: 89, priceId: "price_1T3VRDA5QKTufQ3csurJvjpn", description: "Designed for large scale enterprise infrastructure.", features: ["100 Workstations", "500 Users", "Premium NLP", "24/7 Support"] },
];

function BillingDisabled() {
  return (
    <Box sx={{ pb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: "1.3rem", mb: 0.5 }}>Billing Centre</Typography>
        <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: "0.9rem" }}>Manage your plan and billing details</Typography>
      </Box>
      <Box
        sx={{
          p: 4,
          borderRadius: "16px",
          border: "1px dashed rgba(250, 204, 21, 0.3)",
          bgcolor: "rgba(250, 204, 21, 0.04)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1.5,
          textAlign: "center",
        }}
      >
        <Typography sx={{ color: "#facc15", fontWeight: 700, fontSize: "1rem" }}>
          Billing is disabled
        </Typography>
        <Typography sx={{ color: "rgba(255,255,255,0.45)", fontSize: "0.875rem", maxWidth: 480 }}>
          Stripe integration is currently bypassed (<code style={{ color: "rgba(255,255,255,0.6)" }}>VITE_BYPASS_STRIPE_CONFIRMATION=true</code>).
          Set it to <code style={{ color: "rgba(255,255,255,0.6)" }}>false</code> and configure your Stripe keys and webhook to enable billing.
        </Typography>
      </Box>
    </Box>
  );
}

export default function BillingTab() {
  const { user, refreshUser } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const orgId = localStorage.getItem("org_id");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const fetchData = async () => {
    try {
      const [invRes, cardRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/billing/invoices/${orgId}`, { headers: { Authorization: `Bearer ${localStorage.getItem("jwt")}` } }),
        fetch(`${API_BASE_URL}/api/billing/payment-method/${orgId}`, { headers: { Authorization: `Bearer ${localStorage.getItem("jwt")}` } })
      ]);
      const invData = await invRes.json();
      const cardData = await cardRes.json();

      setInvoices(Array.isArray(invData) ? invData : []);
      if (!cardData.error) setCard(cardData);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
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
      const response = await fetch(`${API_BASE_URL}/api/billing/create-portal-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("jwt")}` },
        body: JSON.stringify({ org_id: orgId }),
      });
      const data = await response.json();
      if (data.url) window.location.href = data.url;
    } catch (err) { console.error(err); }
    finally { setPortalLoading(false); }
  };

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const activePackage = card?.package || user?.package || "basic";
  const subStatus = card?.sub_status || "active";
  const cancelDate = card?.cancel_at_date ? new Date(card.cancel_at_date).toLocaleDateString() : null;
  const currentPlan = PLAN_OPTIONS.find(p => p.id === activePackage) || PLAN_OPTIONS[0];
  const displayedInvoices = invoices.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  if (BYPASS_STRIPE) return <BillingDisabled />;

  return (
    <Box sx={{ pb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: "1.3rem", mb: 0.5 }}>Billing Centre</Typography>
        <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: "0.9rem" }}>Manage your plan and billing details</Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>

        <Grid item xs={12} md={6}>
          <Paper sx={{
              p: 3, bgcolor: "#0A0A0A", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)",
              height: "100%", display: "flex", flexDirection: "column", position: 'relative', overflow: 'hidden'
          }}>
            {isSyncing && (
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, bgcolor: 'rgba(10,10,10,0.85)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                    <SyncIcon sx={{ color: '#4ade80', fontSize: '2.5rem', mb: 2, animation: 'spin 2s linear infinite', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />
                    <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>Syncing with Stripe...</Typography>
                </Box>
            )}

            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                <Typography variant="h6" sx={{ color: "#fff", fontWeight: 700 }}>{currentPlan.name} plan</Typography>
                <Chip
                    label={subStatus === "canceled" ? "Canceled" : "Active"}
                    size="small"
                    sx={{
                        height: 22,
                        bgcolor: subStatus === "canceled" ? "rgba(239, 68, 68, 0.15)" : "#fff",
                        color: subStatus === "canceled" ? "#ef4444" : "#000",
                        fontWeight: 800,
                        fontSize: '0.65rem',
                        border: subStatus === "canceled" ? "1px solid rgba(239, 68, 68, 0.3)" : "none"
                    }}
                />
              </Box>
              {subStatus === "canceled" ? (
                  <Typography sx={{ color: "#ef4444", fontSize: "0.85rem", lineHeight: 1.5, fontWeight: 500 }}>
                      Your subscription was canceled. Access remains until {cancelDate || "the end of the billing period"}. Upgrade to reactivate.
                  </Typography>
              ) : (
                  <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", lineHeight: 1.5 }}>
                      {currentPlan.description}
                  </Typography>
              )}
            </Box>

            <Box sx={{ display: "flex", flexDirection: { xs: 'column', sm: 'row' }, justifyContent: "space-between", alignItems: { xs: 'flex-start', sm: 'flex-end' }, mt: 'auto', pt: 3, gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
                <Typography variant="h3" sx={{ color: "#fff", fontWeight: 800, lineHeight: 1 }}>${currentPlan.price}</Typography>
                <Typography sx={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.4)", fontWeight: 500, ml: 1 }}>/ month</Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'flex-start', sm: 'flex-end' }, gap: 1 }}>
                <Button
                  variant="contained"
                  onClick={handleManageBilling}
                  endIcon={<NorthEastIcon sx={{ fontSize: '1rem !important' }} />}
                  sx={{ bgcolor: "#fff", color: "#000", borderRadius: "8px", px: 2.5, py: 1, textTransform: "none", fontWeight: 700, "&:hover": { bgcolor: "#e5e5e5" } }}
                >
                  {subStatus === "canceled" ? "Reactivate plan" : "Upgrade plan"}
                </Button>

                {subStatus !== "canceled" && (
                  <Typography
                    onClick={handleManageBilling}
                    sx={{
                      cursor: portalLoading ? "not-allowed" : "pointer",
                      fontSize: "0.78rem",
                      color: "rgba(239, 68, 68, 0.6)",
                      fontWeight: 500,
                      userSelect: "none",
                      transition: "color 0.15s",
                      "&:hover": { color: "#ef4444" },
                    }}
                  >
                    {portalLoading ? "Loading..." : "Cancel subscription"}
                  </Typography>
                )}
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{
              p: 3, bgcolor: "#0A0A0A", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)",
              height: "100%", display: "flex", flexDirection: "column"
          }}>
            <Box>
                <Typography variant="h6" sx={{ color: "#fff", fontWeight: 700, mb: 0.5 }}>Payment method</Typography>
                <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", mb: 2 }}>Change how you pay for your plan</Typography>
            </Box>

            <Box sx={{
                p: 2, borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)",
                display: "flex", flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' },
                justifyContent: "space-between", bgcolor: 'rgba(255,255,255,0.02)', mt: 'auto', gap: 2
            }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'rgba(255,255,255,0.8)', bgcolor: 'rgba(255,255,255,0.05)', p: 1, borderRadius: '8px' }}>
                    <CreditCardOutlinedIcon sx={{ fontSize: '1.6rem' }} />
                </Box>
                <Box>
                  <Typography sx={{ color: "#fff", fontWeight: 600, fontSize: "0.95rem", display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    {card && card.brand ? `Card •••• ${card.last4}` : "No card on file"}
                    {card && card.brand && <Chip label="Default" size="small" sx={{ height: 20, fontSize: "0.6rem", bgcolor: 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: 600 }} />}
                  </Typography>
                  <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", mt: 0.3 }}>
                    {card && card.brand ? `Expires ${card.exp_month}/${card.exp_year}` : "Update in billing portal"}
                  </Typography>
                </Box>
              </Box>
              <Button
                onClick={handleManageBilling}
                disabled={portalLoading}
                sx={{ height: 36, minWidth: 70, color: "#000", bgcolor: '#fff', borderRadius: "8px", textTransform: "none", fontWeight: 700, px: 2, '&:hover': { bgcolor: '#e5e5e5' } }}
              >
                {portalLoading ? "..." : "Edit"}
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ bgcolor: "#0A0A0A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", overflow: "hidden" }}>

        <Box sx={{ display: "flex", flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, p: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", gap: 2 }}>
           <Box sx={{ display: 'flex', alignItems: 'center' }}>
             <AccessTimeOutlinedIcon sx={{ fontSize: "1.2rem", mr: 1.5, color: "rgba(255,255,255,0.5)" }} />
             <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: '0.95rem' }}>Billing History</Typography>
           </Box>
           <Box sx={{ ml: { xs: 0, sm: 'auto' }, display: 'flex', gap: 1.5, width: { xs: '100%', sm: 'auto' } }}>
                <TextField
                    placeholder="Search Invoices" size="small"
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlinedIcon sx={{ color: "#555", fontSize: '1.1rem' }} /></InputAdornment> }}
                    sx={{ flexGrow: 1, '& .MuiOutlinedInput-root': { bgcolor: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}}
                />
                <Button startIcon={<FilterListOutlinedIcon />} sx={{ border: '1px solid rgba(255,255,255,0.1)', color: '#ccc', textTransform: 'none', borderRadius: '8px', px: 2, fontSize: '0.85rem' }}>Filter</Button>
           </Box>
        </Box>

        <Box sx={{
            height: '285px',
            overflowX: 'auto',
            overflowY: 'auto',
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            '&::-webkit-scrollbar': { width: '6px', height: '6px' },
            '&::-webkit-scrollbar-track': { background: 'transparent' },
            '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '10px' },
            '&::-webkit-scrollbar-thumb:hover': { backgroundColor: 'rgba(255,255,255,0.25)' }
        }}>
            <Box sx={{ minWidth: 800 }}>
                <Box sx={{ display: "grid", gridTemplateColumns: "40px 1fr 180px 220px 140px 40px", px: "24px", py: "12px", bgcolor: "#0A0A0A", position: 'sticky', top: 0, zIndex: 10, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <Checkbox size="small" disabled sx={{ p: 0 }} />
                  {["Invoice", "Amount", "Date", "Status", ""].map((h) => (
                    <Typography key={h} sx={{ color: "#777", fontSize: "0.7rem", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center' }}>{h}</Typography>
                  ))}
                </Box>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress size={24} sx={{ color: '#4ade80' }} /></Box>
                ) : displayedInvoices.map((inv) => (
                  <Box key={inv.id} sx={{ display: "grid", gridTemplateColumns: "40px 1fr 180px 220px 140px 40px", px: "24px", py: 1.5, alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.04)", "&:hover": { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                    <Checkbox size="small" sx={{ color: "rgba(255,255,255,0.2)", p: 0 }} />
                    <Typography sx={{ color: "rgba(255,255,255,0.9)", fontSize: "0.85rem", fontWeight: 500 }}>{inv.plan}</Typography>
                    <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem" }}>{inv.amount}</Typography>
                    <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem" }}>{inv.date}</Typography>
                    <Box>
                        <Chip icon={<CheckIcon sx={{ fontSize: '0.9rem !important', color: '#4ade80 !important' }} />} label="Paid" size="small" sx={{ bgcolor: "rgba(74, 222, 128, 0.08)", color: "#4ade80", fontWeight: 700, border: '1px solid rgba(74, 222, 128, 0.2)', borderRadius: '6px' }} />
                    </Box>
                    <IconButton onClick={() => window.open(inv.url, '_blank')} sx={{ color: "rgba(255,255,255,0.3)", p: 0, '&:hover': { color: '#fff' } }}><DownloadOutlinedIcon sx={{ fontSize: '1.2rem' }} /></IconButton>
                  </Box>
                ))}
            </Box>
        </Box>

        <TablePagination
            component="div"
            count={invoices.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25]}
            sx={{
                color: 'rgba(255,255,255,0.6)',
                borderBottom: 'none',
                '.MuiTablePagination-selectIcon': { color: 'rgba(255,255,255,0.6)' },
                '.MuiTablePagination-menuItem': { bgcolor: '#111', color: '#fff' }
            }}
        />
      </Box>
    </Box>
  );
}
