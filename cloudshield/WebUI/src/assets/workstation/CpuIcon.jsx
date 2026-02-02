import React from "react";
import PropTypes from "prop-types";

const CpuIcon = ({ width = 20, height = 20, color = "currentColor" }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="5"
      y="5"
      width="14"
      height="14"
      rx="2"
      stroke={color}
      strokeWidth="1.5"
    />
    <rect x="8" y="8" width="8" height="8" rx="1" fill={color} opacity="0.3" />
    <rect
      x="8"
      y="8"
      width="8"
      height="8"
      rx="1"
      stroke={color}
      strokeWidth="1.5"
    />
    {/* Top pins */}
    <line
      x1="8"
      y1="2"
      x2="8"
      y2="5"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <line
      x1="12"
      y1="2"
      x2="12"
      y2="5"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <line
      x1="16"
      y1="2"
      x2="16"
      y2="5"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    {/* Bottom pins */}
    <line
      x1="8"
      y1="19"
      x2="8"
      y2="22"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <line
      x1="12"
      y1="19"
      x2="12"
      y2="22"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <line
      x1="16"
      y1="19"
      x2="16"
      y2="22"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    {/* Left pins */}
    <line
      x1="2"
      y1="8"
      x2="5"
      y2="8"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <line
      x1="2"
      y1="12"
      x2="5"
      y2="12"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <line
      x1="2"
      y1="16"
      x2="5"
      y2="16"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    {/* Right pins */}
    <line
      x1="19"
      y1="8"
      x2="22"
      y2="8"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <line
      x1="19"
      y1="12"
      x2="22"
      y2="12"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <line
      x1="19"
      y1="16"
      x2="22"
      y2="16"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

CpuIcon.propTypes = {
  width: PropTypes.number,
  height: PropTypes.number,
  color: PropTypes.string,
};

export default CpuIcon;
