import PropTypes from "prop-types";

export default function FalsePositiveIcon({
  width = 16,
  height = 16,
  color = "#000000",
  className = "",
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      className={className}
    >
      <path
        d="M14.652 3.555A8 8 0 108 16a1 1 0 100-2 6 6 0 116-6 1 1 0 102 0 8 8 0 00-1.348-4.445z"
        fill={color}
        strokeWidth="1"
      />
      <path
        d="M13 11.586l-1.293-1.293a1 1 0 10-1.414 1.414L11.586 13l-1.293 1.293a1 1 0 101.414 1.414L13 14.414l1.293 1.293a1 1 0 001.414-1.414L14.414 13l1.293-1.293a1 1 0 00-1.414-1.414L13 11.586zm-2.707-6.293L7 8.586 5.707 7.293l-.094-.083a1 1 0 00-1.32 1.497l2 2 .094.083a1 1 0 001.32-.083l4-4 .083-.094a1 1 0 00-1.497-1.32z"
        fill={color}
        strokeWidth="1"
      />
    </svg>
  );
}

FalsePositiveIcon.propTypes = {
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  color: PropTypes.string,
  className: PropTypes.string,
};
