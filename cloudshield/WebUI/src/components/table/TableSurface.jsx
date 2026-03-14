// A simple wrapper component that provides a consistent surface for tables with proper scrolling behavior
// This component ensures that the table takes up the full height of its container and that the content area scrolls properly when the table is too large for the available space.
// It is used in various places in the app where tables are displayed, providing a consistent look and feel while also handling layout concerns.
export default function TableSurface({ children }) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        border: "var(--border)",
        borderRadius: "var(--radius)",
        background: "var(--surface)",
      }}
    >
      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        {children}
      </div>
    </div>
  );
}