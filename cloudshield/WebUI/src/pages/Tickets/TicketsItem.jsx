import React from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";

const parseUTC = (str) => {
    if (!str) return null;
    return new Date(str.endsWith("Z") ? str : str + "Z");
};
const formatDate = (str) => {
    const d = parseUTC(str);
    if (!d) return "N/A";
    return d.toLocaleString([], { month: "numeric", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const HighRiskIcon = () => (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
        <path d="M4.73872 1.9191C5.1138 1.54403 5.6225 1.33331 6.15294 1.33331H9.84838C10.3788 1.33331 10.8875 1.54403 11.2626 1.9191L14.0815 4.73805C14.4566 5.11313 14.6673 5.62183 14.6673 6.15227V9.84771C14.6673 10.3781 14.4566 10.8868 14.0815 11.2619L11.2626 14.0808C10.8875 14.4559 10.3788 14.6666 9.84838 14.6666H6.15294C5.6225 14.6666 5.1138 14.4559 4.73872 14.0808L1.91977 11.2619C1.5447 10.8868 1.33398 10.3781 1.33398 9.84771V6.15227C1.33398 5.62183 1.5447 5.11313 1.91977 4.73805L4.73872 1.9191ZM8.66732 5.33331C8.66732 4.96513 8.36885 4.66665 8.00065 4.66665C7.63245 4.66665 7.33398 4.96513 7.33398 5.33331V8.66665C7.33398 9.03485 7.63245 9.33331 8.00065 9.33331C8.36885 9.33331 8.66732 9.03485 8.66732 8.66665V5.33331ZM8.66732 10.6592C8.66732 10.291 8.36885 9.99251 8.00065 9.99251C7.63245 9.99251 7.33398 10.291 7.33398 10.6592V10.6666C7.33398 11.0348 7.63245 11.3333 8.00065 11.3333C8.36885 11.3333 8.66732 11.0348 8.66732 10.6666V10.6592Z"/>
    </svg>
);
const MediumRiskIcon = () => (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
        <path d="M7.33268 8.66667C7.33268 9.03487 7.63115 9.33333 7.99935 9.33333C8.36755 9.33333 8.66602 9.03487 8.66602 8.66667V6.66667C8.66602 6.29848 8.36755 6 7.99935 6C7.63115 6 7.33268 6.29848 7.33268 6.66667V8.66667ZM8.66602 10.6592C8.66602 10.291 8.36755 9.99253 7.99935 9.99253C7.63115 9.99253 7.33268 10.291 7.33268 10.6592V10.6667C7.33268 11.0349 7.63115 11.3333 7.99935 11.3333C8.36755 11.3333 8.66602 11.0349 8.66602 10.6667V10.6592ZM6.25092 3.10757C7.01295 1.73595 8.98555 1.73595 9.74755 3.10757L14.1482 11.0287C14.8888 12.3618 13.9248 14 12.3999 14H3.59858C2.07361 14 1.10968 12.3618 1.85026 11.0287L6.25092 3.10757Z"/>
    </svg>
);
const LowRiskIcon = () => (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
        <path d="M6.66667 13.3333C2.98467 13.3333 0 10.3487 0 6.66667C0 2.98533 2.98467 0 6.66667 0C10.3487 0 13.3333 2.98533 13.3333 6.66667C13.3333 10.3487 10.3487 13.3333 6.66667 13.3333ZM6.66667 3.33333C6.48986 3.33333 6.32029 3.40357 6.19526 3.5286C6.07024 3.65362 6 3.82319 6 4V7.33333C6 7.51014 6.07024 7.67971 6.19526 7.80474C6.32029 7.92976 6.48986 8 6.66667 8C6.84348 8 7.01305 7.92976 7.13807 7.80474C7.2631 7.67971 7.33333 7.51014 7.33333 7.33333V4C7.33333 3.82319 7.2631 3.65362 7.13807 3.5286C7.01305 3.40357 6.84348 3.33333 6.66667 3.33333ZM6.66667 10C6.84348 10 7.01305 9.92976 7.13807 9.80474C7.2631 9.67971 7.33333 9.51014 7.33333 9.33333C7.33333 9.15652 7.2631 8.98695 7.13807 8.86193C7.01305 8.73691 6.84348 8.66667 6.66667 8.66667C6.48986 8.66667 6.32029 8.73691 6.19526 8.86193C6.07024 8.98695 6 9.15652 6 9.33333C6 9.51014 6.07024 9.67971 6.19526 9.80474C6.32029 9.92976 6.48986 10 6.66667 10Z"/>
    </svg>
);

const priorityConfig = {
    High:   { icon: <HighRiskIcon />,   color: "#ff4d4f" },
    Medium: { icon: <MediumRiskIcon />, color: "#ffb74d" },
    Low:    { icon: <LowRiskIcon />,    color: "#4da6ff" },
};

const GRID_COLUMNS = "2fr 1.4fr 1fr 1fr 40px";
const GRID_COLUMNS_ADMIN = "1.2fr 2fr 1.4fr 1fr 1fr 40px";

function TicketsItem({ ticket, isEven, isSuperAdmin }) {
    const navigate = useNavigate();
    const [hovered, setHovered] = React.useState(false);
    const { icon, color } = priorityConfig[ticket.priority] || priorityConfig.Low;

    const styles = {
        row: {
            display: "grid",
            gridTemplateColumns: isSuperAdmin ? GRID_COLUMNS_ADMIN : GRID_COLUMNS,
            alignItems: "center",
            gap: "12px",
            padding: "12px 16px",
            cursor: "pointer",
            backgroundColor: hovered
                ? "rgba(255,255,255,0.07)"
                : isEven
                ? "rgba(255,255,255,0.04)"
                : "transparent",
            transition: "background-color 0.15s",
        },
        cell: {
            fontSize: "0.875rem",
            color: "#fff",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
        },
        dimCell: {
            fontSize: "0.875rem",
            color: "rgba(255,255,255,0.45)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
        },
        priorityCell: {
            display: "flex",
            alignItems: "center",
            gap: "7px",
            color,
        },
        actionCell: {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "40px",
        },
        editBtn: {
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.3)",
            cursor: "pointer",
            padding: "4px",
            borderRadius: "4px",
            display: "inline-flex",
            transition: "color 0.15s",
        },
    };

    return (
        <div
            role="button"
            tabIndex={0}
            style={styles.row}
            onClick={() => navigate(`/tickets/${ticket.id}`)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate(`/tickets/${ticket.id}`); }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {isSuperAdmin && (
                <span style={{ ...styles.dimCell, fontFamily: "monospace", fontSize: "0.8rem" }}>
                    {ticket.org_id ? ticket.org_id.substring(0, 8) + "..." : "Unknown"}
                </span>
            )}
            <span style={{ ...styles.cell, fontWeight: 500 }}>{ticket.title}</span>
            <span style={styles.dimCell}>{formatDate(ticket.created_at)}</span>
            <div style={styles.priorityCell}>
                {icon}
                <span style={{ fontSize: "0.855rem", fontWeight: 500 }}>{ticket.priority}</span>
            </div>
            <span style={{ ...styles.cell, color: ticket.status === "Closed" ? "rgba(255,255,255,0.35)" : "#fff" }}>
                {ticket.status}
            </span>
            <div style={styles.actionCell}>
                <button
                    style={styles.editBtn}
                    onClick={e => { e.stopPropagation(); navigate(`/tickets/${ticket.id}`); }}
                    onMouseEnter={e => e.currentTarget.style.color = "#fff"}
                    onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.3)"}
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </button>
            </div>
        </div>
    );
}

TicketsItem.propTypes = {
    ticket: PropTypes.object.isRequired,
    isEven: PropTypes.bool,
    isSuperAdmin: PropTypes.bool,
};

export default TicketsItem;