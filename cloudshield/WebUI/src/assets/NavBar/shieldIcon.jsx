export default function ShieldIcon({
  selected = false,
  width = 16,
  height = 16,
  className = "",
}) {
  const color = selected ? "var(--text-primary)" : "#BCBCBC";

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M8 1.5C7.85 1.5 7.7 1.53 7.55 1.58C6.8 1.85 4.3 2.78 3.5 3.1C3 3.3 2.7 3.5 2.7 4.1V9.1C2.7 11.5 3.95 12.35 7.65 14.45C7.8 14.53 7.9 14.55 8 14.55C8.1 14.55 8.2 14.53 8.35 14.45C12.05 12.35 13.3 11.5 13.3 9.1V4.1C13.3 3.5 13 3.3 12.5 3.1C11.75 2.78 9.2 1.85 8.45 1.58C8.3 1.53 8.15 1.5 8 1.5Z"
        stroke={color}
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={selected ? color : "none"}
      />
    </svg>
  );
}
