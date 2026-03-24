import React, { useState, useMemo, useEffect } from "react";

import TicketsTable from "./TicketsTable";
import SearchField from "../../components/common/SearchField/SearchField";
import RefreshButton from "../../components/common/RefreshButton/RefreshButton";
import FilterButton from "../../components/common/FilterButton/FilterButton";
import Pagination from "../../components/common/Pagination/Pagination";
import { TICKET_FILTERS } from "../../config/filterConfigs";
import { createFilterChangeHandler } from "../../utils/filterHelpers";
import { useThemeColors } from "../../hooks/useThemeColors.js";
import { useTickets } from "../../api/ticketsApi";
import { apiGet } from "../../api/client";
import CreateTicketModal from "../../components/Tickets/CreateTicketModal";

function TicketDashboard() {
    const themeColors = useThemeColors();
    const { tickets, loading, error, refreshTickets } = useTickets();
    
    const styles = {
        page: {
            padding: "32px",
            maxWidth: "1400px",
            margin: "0 auto",
            color: themeColors.textPrimary,
            fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        },
        header: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "28px",
        },
        pageTitle: {
            margin: 0,
            fontSize: "1.25rem",
            fontWeight: 600,
        },
        createBtn: {
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 16px",
            borderRadius: "8px",
            border: "none",
            backgroundColor: themeColors.textPrimary,
            color: themeColors.bgPrimary,
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "background-color 0.15s",
        },
        metricsRow: {
            display: "flex",
            gap: "16px",
            marginBottom: "28px",
            flexWrap: "wrap",
        },
        metricCard: {
            flex: "1 1 160px",
            backgroundColor: themeColors.bgSecondary,
            border: `1px solid ${themeColors.borderLight}`,
            borderRadius: "12px",
            padding: "20px",
        },
        metricLabel: {
            fontSize: "0.72rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.8px",
            color: themeColors.textSecondary,
            marginBottom: "8px",
        },
        metricValue: {
            fontSize: "1.75rem",
            fontWeight: 500,
            color: themeColors.textPrimary,
        },
        container: {
            backgroundColor: themeColors.bgSecondary,
            borderRadius: "16px",
            padding: "16px",
            border: `1px solid ${themeColors.borderLight}`,
        },
        containerHeader: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
        },
        containerTitle: {
            fontSize: "14px",
            fontWeight: "500",
            color: themeColors.textPrimary,
            margin: 0,
        },
        headerRight: {
            display: "flex",
            alignItems: "center",
            gap: "8px",
        },
        tableWrapper: {
            height: "340px",
            display: "flex",
            flexDirection: "column",
        },
    };
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [userEmail, setUserEmail] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [activeFilters, setActiveFilters] = useState({
        priority: new Set(),
        status: new Set(),
    });
    const itemsPerPage = 6;

    useEffect(() => {
        let mounted = true;
        apiGet("/users/me").then(res => {
            if (mounted) setUserEmail(res.user?.email || "");
        }).catch(err => console.error("Failed to fetch user email", err));
        return () => { mounted = false; };
    }, []);

    useEffect(() => { setCurrentPage(1); }, [searchQuery, activeFilters]);

    const isSuperAdmin = userEmail === "support@cloudshield.com";
    const handleFilterChange = createFilterChangeHandler(setActiveFilters);

    const metrics = useMemo(() => {
        if (!tickets) return { total: 0, open: 0, closed: 0, highPriority: 0 };
        return {
            total: tickets.length,
            open: tickets.filter(t => t.status === "Open" || t.status === "Pending").length,
            closed: tickets.filter(t => t.status === "Closed").length,
            highPriority: tickets.filter(t => t.priority === "High" && t.status !== "Closed").length,
        };
    }, [tickets]);

    const filteredTickets = useMemo(() => {
        if (!tickets) return [];
        let result = tickets;

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(t =>
                t.title.toLowerCase().includes(q) ||
                (isSuperAdmin && t.org_id && t.org_id.toLowerCase().includes(q))
            );
        }

        if (activeFilters.priority.size > 0) {
            result = result.filter(t => activeFilters.priority.has(t.priority));
        }

        if (activeFilters.status.size > 0) {
            result = result.filter(t => activeFilters.status.has(t.status));
        }

        return result;
    }, [tickets, searchQuery, activeFilters, isSuperAdmin]);

    const paginatedTickets = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredTickets.slice(start, start + itemsPerPage);
    }, [filteredTickets, currentPage]);

    if (loading) return <div style={{ padding: "32px", color: themeColors.textTertiary }}>Loading support tickets...</div>;
    if (error) return <div style={{ padding: "32px", color: "#ff4d4f" }}>Error loading tickets: {error.message}</div>;

    return (
        <div style={styles.page}>

            <div style={styles.header}>
                <h2 style={styles.pageTitle}>
                    {isSuperAdmin ? "Global Support Helpdesk" : "Support Helpdesk"}
                </h2>
                {!isSuperAdmin && (
                    <button
                        style={styles.createBtn}
                        onClick={() => setIsModalOpen(true)}
                        onMouseEnter={e => {
                            const isLight = themeColors.isDark === false;
                            e.currentTarget.style.backgroundColor = isLight ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)';
                        }}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = themeColors.textPrimary}
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        Create Ticket
                    </button>
                )}
            </div>

            <div style={styles.metricsRow}>
                {[
                    { label: "Total Tickets",  value: metrics.total },
                    { label: "Active Issues",  value: metrics.open },
                    { label: "High Priority",  value: metrics.highPriority },
                    { label: "Resolved",       value: metrics.closed },
                ].map(({ label, value }) => (
                    <div key={label} style={styles.metricCard}>
                        <div style={styles.metricLabel}>{label}</div>
                        <div style={styles.metricValue}>{value}</div>
                    </div>
                ))}
            </div>

            <div style={styles.container}>
                <div style={styles.containerHeader}>
                    <h3 style={styles.containerTitle}>Support Tickets</h3>
                    <div style={styles.headerRight}>
                        <SearchField
                            placeholder="Search tickets"
                            value={searchQuery}
                            onChange={setSearchQuery}
                        />
                        <FilterButton
                            filterGroups={TICKET_FILTERS}
                            activeFilters={activeFilters}
                            onFilterChange={handleFilterChange}
                        />
                        <RefreshButton onClick={refreshTickets} />
                    </div>
                </div>

                <div style={styles.tableWrapper}>
                    <TicketsTable
                        tickets={paginatedTickets}
                        isSuperAdmin={isSuperAdmin}
                        hasNoTickets={!tickets || tickets.length === 0}
                        hasNoResults={filteredTickets.length === 0}
                    />
                </div>

                <Pagination
                    totalItems={filteredTickets.length}
                    itemsPerPage={itemsPerPage}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                    itemLabel="tickets"
                />
            </div>

            <CreateTicketModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={refreshTickets}
            />
        </div>
    );
}

export default TicketDashboard;