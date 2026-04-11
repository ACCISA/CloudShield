import PropTypes from "prop-types";

export default function SaveIcon({
  width = 16,
  height = 16,
  color = "currentColor",
  className = "",
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M13 3H7C5.89543 3 5 3.89543 5 5V10M13 3L19 9M13 3V8C13 8.55228 13.4477 9 14 9H19M19 9V19C19 20.1046 18.1046 21 17 21H10C7.79086 21 6 19.2091 6 17V17C6 14.7909 7.79086 13 10 13H13M13 13L10 10M13 13L10 16"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

SaveIcon.propTypes = {
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  color: PropTypes.string,
  className: PropTypes.string,
};
