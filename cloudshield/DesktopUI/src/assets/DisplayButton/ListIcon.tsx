type ListIconProps = {
  width?: number;
  height?: number;
  color?: string;
  className?: string;
};

export default function ListIcon({
  width = 28,
  height = 21,
  color = "currentColor",
  className = "",
}: ListIconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 28 21"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="0.5" y="0.5" width="27" height="20" rx="1.5" stroke={color} />
      <path d="M0.5 7H27.5M0.5 14H27.5" stroke={color} />
    </svg>
  );
}
