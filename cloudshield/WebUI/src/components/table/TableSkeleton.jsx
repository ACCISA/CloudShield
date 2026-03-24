import Skeleton from "../ui/Skeleton";

export default function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div 
      style={{ 
        display: "flex", 
        flexDirection: "column", 
        gap: "14px", 
        width: "100%",
        opacity: 0,
        animation: "skeletonFadeIn 0.3s ease-in-out 0.15s forwards" // 150ms delay!
      }}
    >
      <style>{`
        @keyframes skeletonFadeIn {
          to { opacity: 1; }
        }
      `}</style>
      
      {/* Mimic Table Headers */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: "12px", padding: "16px 24px 8px 24px" }}>
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={`h-${c}`} height={14} width="60%" style={{ opacity: 0.5 }} />
        ))}
      </div>

      {/* Mimic the real List Panel */}
      <div style={{ 
        borderRadius: "18px",
        border: "1px solid var(--border)",
        backgroundColor: "var(--bg-secondary)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "14px"
      }}>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: "12px", padding: "12px 8px" }}>
            {Array.from({ length: cols }).map((__, c) => (
              <Skeleton 
                key={`r-${r}-c-${c}`} 
                height={c === 0 ? 28 : 16} 
                width={c === 0 ? 28 : "80%"} 
                style={{ borderRadius: c === 0 ? "50%" : 8 }} 
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}