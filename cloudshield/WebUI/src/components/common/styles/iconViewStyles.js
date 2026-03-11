/**
 * Shared styles for icon-view layouts across management pages.
 */
export const sharedIconViewStyles = {
  iconsWrapper: {
    flex: 1,
    overflow: "auto",
    minHeight: 0,
    overscrollBehavior: "contain",
    marginTop: "14px",
  },
  selectionBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "12px",
  },
  selectionLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  selectAllButton: {
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
  selectedCount: {
    fontSize: "12px",
    opacity: 0.75,
  },
  iconsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: "12px",
  },
  iconCard: {
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(0,0,0,0.15)",
    borderRadius: "14px",
    padding: "14px",
    minHeight: "180px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  iconCardSelected: {
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.06)",
  },
  iconCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: "28px",
  },
  iconTitle: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    minWidth: 0,
  },
  iconTitleText: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  iconName: {
    fontWeight: 600,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  iconSub: {
    fontSize: "0.85rem",
    opacity: 0.85,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  iconMetaRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    fontSize: "0.85rem",
    minWidth: 0,
  },
  iconMetaLabel: {
    opacity: 0.68,
    whiteSpace: "nowrap",
  },
  iconMetaValue: {
    opacity: 0.9,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
};
