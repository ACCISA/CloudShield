type ConnectIconProps = {
  width?: number;
  height?: number;
  color?: string;
  className?: string;
};

export default function ConnectIcon({
  width = 14,
  height = 14,
  color = "currentColor",
  className = "",
}: ConnectIconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
      className={className}
      aria-hidden="true"
    >
      <g transform="translate(0.33335, 0.33335)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M6.66667 13.3333C10.3485 13.3333 13.3333 10.3485 13.3333 6.66667C13.3333 2.98477 10.3485 0 6.66667 0C2.98477 0 0 2.98477 0 6.66667C0 10.3485 2.98477 13.3333 6.66667 13.3333ZM5.79567 9.23053L8.94247 7.37267C9.4636 7.06493 9.4636 6.2684 8.94247 5.96067L5.79567 4.10279C5.28914 3.80374 4.66667 4.19298 4.66667 4.80877V8.52453C4.66667 9.14033 5.28914 9.5296 5.79567 9.23053Z"
          fill={color}
        />
      </g>
    </svg>
  );
}
