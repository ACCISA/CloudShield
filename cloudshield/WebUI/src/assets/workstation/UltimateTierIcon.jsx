import React from "react";
import PropTypes from "prop-types";

const UltimateTierIcon = ({ width = 32, height = 32, color = "#AB47BC" }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Rocket body */}
    <path
      d="M16 4C16 4 10 10 10 18C10 22 12 26 16 28C20 26 22 22 22 18C22 10 16 4 16 4Z"
      stroke={color}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M16 4C16 4 10 10 10 18C10 22 12 26 16 28C20 26 22 22 22 18C22 10 16 4 16 4Z"
      fill={color}
      opacity="0.2"
    />
    {/* Window */}
    <circle cx="16" cy="14" r="3" stroke={color} strokeWidth="1.5" />
    <circle cx="16" cy="14" r="1.5" fill={color} opacity="0.4" />
    {/* Left fin */}
    <path
      d="M10 20L6 24L8 20"
      stroke={color}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path d="M10 20L6 24L8 20" fill={color} opacity="0.15" />
    {/* Right fin */}
    <path
      d="M22 20L26 24L24 20"
      stroke={color}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path d="M22 20L26 24L24 20" fill={color} opacity="0.15" />
    {/* Flame */}
    <path
      d="M14 28C14 28 15 30 16 30C17 30 18 28 18 28"
      stroke="#FF7043"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M15 28C15 28 15.5 31 16 31C16.5 31 17 28 17 28"
      stroke="#FFB74D"
      strokeWidth="1"
      strokeLinecap="round"
    />
  </svg>
);

UltimateTierIcon.propTypes = {
  width: PropTypes.number,
  height: PropTypes.number,
  color: PropTypes.string,
};

export default UltimateTierIcon;
