export default function RowsIcon({
  width = 28,
  height = 17,
  color = "#2E2E2E",
  className = "",
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 28 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="0.5" y="0.5" width="27" height="6" rx="1.5" stroke={color} />
      <rect x="0.5" y="10.5" width="27" height="6" rx="1.5" stroke={color} />
    </svg>
  );
}
