const SidebarLeftIcon = ({
  width = 64,
  height = 64,
  color = "#000000",
  className = "",
}) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      fill={color}
      className={className}
    >
      <g id="SVGRepo_bgCarrier" strokeWidth="0" />
      <g
        id="SVGRepo_tracerCarrier"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g id="SVGRepo_iconCarrier">
        <title>Sidebar Left</title>
        <g id="Complete">
          <g id="sidebar-left">
            <g>
              <rect
                id="Square-2"
                data-name="Square"
                x="3"
                y="3"
                width="18"
                height="18"
                rx="2"
                ry="2"
                fill="none"
                stroke={color}
                strokeMiterlimit="10"
                strokeWidth="2"
              />
              <line
                x1="9"
                y1="21"
                x2="9"
                y2="3"
                fill="none"
                stroke={color}
                strokeMiterlimit="10"
                strokeWidth="2"
              />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
};

export default SidebarLeftIcon;
