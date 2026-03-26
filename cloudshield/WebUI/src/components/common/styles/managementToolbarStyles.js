export const managementToolbarStyles = {
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "nowrap",
    flexShrink: 0,
  },
  leftActions: {
    display: "flex",
    gap: "10px",
    flex: "1 1 auto",
    flexWrap: "nowrap",
    minWidth: "0",
  },
  rightActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "nowrap",
    alignItems: "center",
  },
  selectionSummary: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  selectionSummaryCount: {
    fontSize: "12px",
    color: "rgba(255,255,255,0.75)",
    whiteSpace: "nowrap",
  },
  clearSelectionButton: {
    border: "1px solid rgba(255, 255, 255, 0.16)",
    background: "rgba(255, 255, 255, 0.03)",
    color: "#fff",
    fontSize: "0.85rem",
    fontWeight: 500,
    fontFamily: "inherit",
    lineHeight: 1,
    borderRadius: "8px",
    padding: "7px 10px",
    cursor: "pointer",
  },
};
