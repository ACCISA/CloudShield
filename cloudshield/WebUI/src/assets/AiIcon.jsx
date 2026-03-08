import PropTypes from "prop-types";

export default function AiIcon({
  width = 16,
  height = 16,
  color = "#101011",
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
        d="M8 2C8 5.31371 10.6863 8 14 8C10.6863 8 8 10.6863 8 14C8 10.6863 5.31371 8 2 8C3.777 8 5.37357 7.22747 6.47221 6"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

AiIcon.propTypes = {
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  color: PropTypes.string,
  className: PropTypes.string,
};
