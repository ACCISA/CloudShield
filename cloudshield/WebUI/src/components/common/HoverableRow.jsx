import React from "react";
import { useThemeColors } from "../../hooks/useThemeColors.js";

/**
 * HoverableRow
 *
 * A reusable row wrapper that adds hover background and zIndex effects.
 * Props:
 *   - style: object (additional styles to apply)
 *   - className: string (optional)
 *   - children: ReactNode
 *   - ...rest: any other props (e.g., onClick)
 */
const HoverableRow = ({ style = {}, className = "", children, ...rest }) => {
  const themeColors = useThemeColors();
  const handleMouseEnter = (e) => {
    e.currentTarget.style.backgroundColor = themeColors.lightOverlaySubtle;
    e.currentTarget.style.zIndex = "100";
  };
  const handleMouseLeave = (e) => {
    e.currentTarget.style.backgroundColor = "transparent";
    e.currentTarget.style.zIndex = "1";
  };
  return (
    <div
      className={className}
      style={style}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...rest}
    >
      {children}
    </div>
  );
};

export default HoverableRow;
