export default function UsersIcon({
  selected = false,
  width = 18,
  height = 14,
  className = "",
}) {
  const color = selected ? "var(--text-primary)" : "#BCBCBC";
  const fillOpacity = selected ? "1" : "0";

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 18 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M12.5547 1.64822C12.8238 1.54848 13.1147 1.49399 13.4185 1.49399C14.7908 1.49399 15.9034 2.60653 15.9034 3.97892C15.9034 5.3513 14.7908 6.46386 13.4185 6.46386C13.1147 6.46386 12.8238 6.40939 12.5547 6.30959"
        stroke={color}
        strokeLinecap="round"
        fill={color}
        fillOpacity={fillOpacity}
      />
      <path
        d="M0 13.4217C0.687204 11.1284 2.4551 10.4397 6.46083 10.4397C10.4665 10.4397 12.2344 11.1284 12.9217 13.4217"
        stroke={color}
        strokeLinecap="round"
        fill={color}
        fillOpacity={fillOpacity}
      />
      <path
        d="M13.916 9.44577C16.3045 9.5402 17.4239 10.0802 17.8919 11.4337"
        stroke={color}
        strokeLinecap="round"
        fill={color}
        fillOpacity={fillOpacity}
      />
      <path
        d="M9.93926 3.97891C9.93926 5.90026 8.38171 7.45782 6.46035 7.45782C4.539 7.45782 2.98145 5.90026 2.98145 3.97891C2.98145 2.05756 4.539 0.5 6.46035 0.5C8.38171 0.5 9.93926 2.05756 9.93926 3.97891Z"
        stroke={color}
        fill={color}
        fillOpacity={fillOpacity}
      />
    </svg>
  );
}
