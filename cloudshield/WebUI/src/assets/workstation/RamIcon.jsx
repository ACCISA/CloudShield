import React from "react";
import PropTypes from "prop-types";

const RamIcon = ({ width = 20, height = 20, color = "currentColor" }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Main board */}
    <rect
      x="2"
      y="6"
      width="20"
      height="10"
      rx="2"
      stroke={color}
      strokeWidth="1.5"
    />
    {/* Chips */}
    <rect
      x="5"
      y="9"
      width="3"
      height="4"
      rx="0.5"
      fill={color}
      opacity="0.4"
    />
    <rect
      x="10"
      y="9"
      width="3"
      height="4"
      rx="0.5"
      fill={color}
      opacity="0.4"
    />
    <rect
      x="15"
      y="9"
      width="3"
      height="4"
      rx="0.5"
      fill={color}
      opacity="0.4"
    />
    {/* Bottom notch */}
    <path d="M8 16V18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path
      d="M12 16V18"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M16 16V18"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    {/* Connector pins at bottom */}
    <rect
      x="4"
      y="16"
      width="16"
      height="2"
      rx="0.5"
      stroke={color}
      strokeWidth="1"
    />
  </svg>
);

RamIcon.propTypes = {
  width: PropTypes.number,
  height: PropTypes.number,
  color: PropTypes.string,
};

export default RamIcon;
