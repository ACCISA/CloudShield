const base = {
  borderRadius: 10,
  background: "linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.10) 37%, rgba(255,255,255,0.06) 63%)",
  backgroundSize: "400% 100%",
  animation: "shimmer 1.2s ease-in-out infinite",
};

export default function Skeleton({ height = 14, width = "100%", style }) {
  return <div style={{ ...base, height, width, ...style }} />;
}