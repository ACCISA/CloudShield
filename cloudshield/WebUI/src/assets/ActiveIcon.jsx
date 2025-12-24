export default function StatusDotIcon({
  width = 12,
  height = 12,
  outerColor = "#1F381F",
  innerColor = "#04C40A",
  className = "",
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="6" cy="6" r="6" fill={outerColor} />
      <circle cx="6" cy="6" r="2.5" fill={innerColor} />
    </svg>
  );
}
