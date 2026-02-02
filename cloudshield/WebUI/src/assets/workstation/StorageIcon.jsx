import React from "react";
import PropTypes from "prop-types";

const StorageIcon = ({ width = 20, height = 20, color = "currentColor" }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* SSD/Drive body */}
    <rect
      x="3"
      y="4"
      width="18"
      height="16"
      rx="2"
      stroke={color}
      strokeWidth="1.5"
    />
    {/* Inner area */}
    <rect
      x="5"
      y="6"
      width="14"
      height="12"
      rx="1"
      stroke={color}
      strokeWidth="1"
      opacity="0.4"
    />
    {/* Circuit lines */}
    <path d="M7 10H11" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M7 14H13" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    {/* Status indicator */}
    <circle cx="17" cy="16" r="1.5" fill={color} opacity="0.6" />
    {/* Brand area */}
    <rect
      x="14"
      y="8"
      width="3"
      height="2"
      rx="0.5"
      fill={color}
      opacity="0.3"
    />
  </svg>
);

StorageIcon.propTypes = {
  width: PropTypes.number,
  height: PropTypes.number,
  color: PropTypes.string,
};

export default StorageIcon;
