import React from "react";
import PropTypes from "prop-types";

const ProTierIcon = ({ width = 32, height = 32, color = "#FFA726" }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Lightning bolt / Power symbol */}
    <path
      d="M17.5 3L8 16H14.5L12.5 29L24 14H16.5L17.5 3Z"
      stroke={color}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M17.5 3L8 16H14.5L12.5 29L24 14H16.5L17.5 3Z"
      fill={color}
      opacity="0.2"
    />
    {/* Glow effect */}
    <path
      d="M17.5 3L8 16H14.5L12.5 29L24 14H16.5L17.5 3Z"
      stroke={color}
      strokeWidth="3"
      strokeLinejoin="round"
      opacity="0.15"
    />
  </svg>
);

ProTierIcon.propTypes = {
  width: PropTypes.number,
  height: PropTypes.number,
  color: PropTypes.string,
};

export default ProTierIcon;
