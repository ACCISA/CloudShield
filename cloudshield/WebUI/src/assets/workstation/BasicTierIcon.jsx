import React from "react";
import PropTypes from "prop-types";

const BasicTierIcon = ({ width = 32, height = 32, color = "#64B5F6" }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Monitor */}
    <rect
      x="4"
      y="4"
      width="24"
      height="16"
      rx="2"
      stroke={color}
      strokeWidth="1.5"
    />
    {/* Screen */}
    <rect
      x="6"
      y="6"
      width="20"
      height="12"
      rx="1"
      fill={color}
      opacity="0.15"
    />
    {/* Screen shine */}
    <path
      d="M7 7L9 9"
      stroke={color}
      strokeWidth="1"
      strokeLinecap="round"
      opacity="0.4"
    />
    {/* Stand neck */}
    <path d="M14 20H18V24H14V20Z" stroke={color} strokeWidth="1.5" />
    {/* Stand base */}
    <path d="M10 24H22" stroke={color} strokeWidth="2" strokeLinecap="round" />
    {/* Power indicator */}
    <circle cx="16" cy="18" r="1" fill={color} />
  </svg>
);

BasicTierIcon.propTypes = {
  width: PropTypes.number,
  height: PropTypes.number,
  color: PropTypes.string,
};

export default BasicTierIcon;
