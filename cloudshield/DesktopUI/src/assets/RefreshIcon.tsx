type RefreshIconProps = {
  width?: number;
  height?: number;
  color?: string;
  className?: string;
};

export default function RefreshIcon({
  width = 16,
  height = 16,
  color = "currentColor",
  className = "",
}: RefreshIconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M0.668945 2.6709V6.6709H4.66895"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.3311 13.3333V9.33325H11.3311"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.6623 6.00062C13.3242 5.04514 12.7495 4.19089 11.992 3.51757C11.2344 2.84424 10.3186 2.3738 9.33009 2.15013C8.34154 1.92645 7.31244 1.95685 6.33882 2.23847C5.36519 2.52009 4.47878 3.04376 3.76228 3.76062L0.668945 6.66729M15.3356 9.33395L12.2423 12.2406C11.5258 12.9575 10.6394 13.4812 9.66574 13.7628C8.69212 14.0444 7.66302 14.0748 6.67447 13.8511C5.68592 13.6274 4.77015 13.157 4.01259 12.4837C3.25503 11.8104 2.68039 10.9561 2.34228 10.0006"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
