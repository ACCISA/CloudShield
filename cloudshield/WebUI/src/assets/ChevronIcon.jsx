import React from "react";
import PropTypes from "prop-types";

function ChevronIcon({
  size = 24,
  color = "#000000",
  rotation = 0,
  className = "",
  style = {},
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        transform: `rotate(${rotation}deg)`,
        transition: "transform 0.2s",
        ...style,
      }}
    >
      <path
        d="M6 9L12 15L18 9"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

ChevronIcon.propTypes = {
  size: PropTypes.number,
  color: PropTypes.string,
  rotation: PropTypes.number,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default ChevronIcon;
