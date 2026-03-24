export default function Skeleton({ height = 14, width = "100%", style }) {
  const base = {
    borderRadius: 8,
    background: "linear-gradient(90deg, var(--lightOverlaySubtle) 25%, var(--lightOverlay) 37%, var(--lightOverlaySubtle) 63%)",
    backgroundSize: "400% 100%",
    animation: "shimmer 1.2s ease-in-out infinite",
  };

  return <div style={{ ...base, height, width, ...style }} />;
}