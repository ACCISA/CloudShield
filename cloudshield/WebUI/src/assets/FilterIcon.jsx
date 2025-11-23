export default function FilterIcon({
  width = 16,
  height = 16,
  color = "white",
  className = "",
}) {
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
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.04345 2C2.46739 2 2 2.47524 2 3.06027V3.68429C2 4.11765 2.16479 4.53439 2.45957 4.84785L5.69007 8.28287L5.69149 8.28073C6.31514 8.9192 6.66603 9.78227 6.66603 10.6822V13.7301C6.66603 13.9338 6.87913 14.0638 7.056 13.9677L8.89573 12.9653C9.17347 12.8136 9.34673 12.5189 9.34673 12.1989V10.6743C9.34673 9.7794 9.69267 8.91993 10.3107 8.28287L13.5411 4.84785C13.8352 4.53439 14 4.11765 14 3.68429V3.06027C14 2.47524 13.5333 2 12.9573 2H3.04345Z"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.66699 4.66666H13.667"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
