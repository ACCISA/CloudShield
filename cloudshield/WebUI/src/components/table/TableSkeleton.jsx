// A simple skeleton loader component for tables, displaying placeholder rows and columns while data is being fetched
// This component is used in various places in the app where tables are displayed, providing a consistent loading state that indicates to users that data is being loaded without showing empty or broken tables.
import Skeleton from "../ui/Skeleton";

export default function TableSkeleton({ rows = 8, cols = 5 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <Skeleton height={36} />
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12 }}>
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton key={c} height={14} />
          ))}
        </div>
      ))}
    </div>
  );
}