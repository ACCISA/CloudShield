import React from "react";
import PropTypes from "prop-types";
import TicketsItem from "./TicketsItem";

const GRID_COLUMNS = "2fr 1.4fr 1fr 1fr 40px";
const GRID_COLUMNS_ADMIN = "1.2fr 2fr 1.4fr 1fr 1fr 40px";

function TicketsTable({
    tickets = [],
    isSuperAdmin = false,
    hasNoTickets = false,
    hasNoResults = false,
}) {
    const styles = {
        tableHeaders: {
            display: "grid",
            gridTemplateColumns: isSuperAdmin ? GRID_COLUMNS_ADMIN : GRID_COLUMNS,
            alignItems: "center",
            gap: "12px",
            padding: "10px 16px",
            position: "sticky",
            top: 0,
            zIndex: 10,
            backgroundColor: "#0f0f0f",
        },
        headerLabel: {
            fontSize: "0.85rem",
            color: "rgba(255,255,255,0.7)",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
            gap: "4px",
        },
        actionWrapper: {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "40px",
        },
        tableBody: {
            display: "flex",
            flexDirection: "column",
            minHeight: "300px",
        },
        emptyState: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "300px",
            color: "rgba(255,255,255,0.5)",
            textAlign: "center",
            gap: "8px",
        },
        emptyStateTitle: {
            fontSize: "16px",
            fontWeight: "500",
            color: "rgba(255,255,255,0.7)",
        },
        emptyStateSubtitle: {
            fontSize: "14px",
            color: "rgba(255,255,255,0.5)",
        },
    };

    return (
        <>
            <div style={styles.tableHeaders}>
                {isSuperAdmin && <span style={styles.headerLabel}>Org ID</span>}
                <span style={styles.headerLabel}>Ticket Title</span>
                <span style={styles.headerLabel}>Date</span>
                <span style={styles.headerLabel}>Priority</span>
                <span style={styles.headerLabel}>Status</span>
                <div style={styles.actionWrapper}></div>
            </div>

            <div style={styles.tableBody}>
                {hasNoTickets || hasNoResults ? (
                    <div style={styles.emptyState}>
                        <div style={styles.emptyStateTitle}>
                            {hasNoTickets ? "No tickets yet" : "No tickets found"}
                        </div>
                        <div style={styles.emptyStateSubtitle}>
                            {hasNoTickets
                                ? "Create your first ticket to get started"
                                : "Try adjusting your search or filter criteria"}
                        </div>
                    </div>
                ) : (
                    tickets.map((ticket, index) => (
                        <TicketsItem
                            key={ticket.id}
                            ticket={ticket}
                            isEven={index % 2 === 0}
                            isSuperAdmin={isSuperAdmin}
                        />
                    ))
                )}
            </div>
        </>
    );
}

TicketsTable.propTypes = {
    tickets: PropTypes.array,
    isSuperAdmin: PropTypes.bool,
    hasNoTickets: PropTypes.bool,
    hasNoResults: PropTypes.bool,
};

export default TicketsTable;