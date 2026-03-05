import PropTypes from "prop-types";

const LowAlertIcon = ({
  width = "64px",
  height = "64px",
  fill = "#000000",
  className = "jam jam-alert-f",
}) => {
  return (
    <svg
      fill={fill}
      width={width}
      height={height}
      viewBox="-2 -1.5 24 24"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMinYMin"
      className={className}
    >
      <g id="SVGRepo_bgCarrier" strokeWidth="0" />
      <g
        id="SVGRepo_tracerCarrier"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g id="SVGRepo_iconCarrier">
        <path d="M10 20.393c-5.523 0-10-4.477-10-10 0-5.522 4.477-10 10-10s10 4.478 10 10c0 5.523-4.477 10-10 10zm0-15a1 1 0 0 0-1 1v5a1 1 0 0 0 2 0v-5a1 1 0 0 0-1-1zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
      </g>
    </svg>
  );
};

LowAlertIcon.propTypes = {
  width: PropTypes.string,
  height: PropTypes.string,
  fill: PropTypes.string,
  className: PropTypes.string,
};

export default LowAlertIcon;
