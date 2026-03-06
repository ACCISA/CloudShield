import PropTypes from "prop-types";

const HighAlertIcon = ({
  width = "16",
  height = "16",
  className = "",
  fill = "#EB6560",
}) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g clipPath="url(#clip0_444_48)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M4.73872 1.9191C5.1138 1.54403 5.6225 1.33331 6.15294 1.33331H9.84838C10.3788 1.33331 10.8875 1.54403 11.2626 1.9191L14.0815 4.73805C14.4566 5.11313 14.6673 5.62183 14.6673 6.15227V9.84771C14.6673 10.3781 14.4566 10.8868 14.0815 11.2619L11.2626 14.0808C10.8875 14.4559 10.3788 14.6666 9.84838 14.6666H6.15294C5.6225 14.6666 5.1138 14.4559 4.73872 14.0808L1.91977 11.2619C1.5447 10.8868 1.33398 10.3781 1.33398 9.84771V6.15227C1.33398 5.62183 1.5447 5.11313 1.91977 4.73805L4.73872 1.9191ZM8.66732 5.33331C8.66732 4.96513 8.36885 4.66665 8.00065 4.66665C7.63245 4.66665 7.33398 4.96513 7.33398 5.33331V8.66665C7.33398 9.03485 7.63245 9.33331 8.00065 9.33331C8.36885 9.33331 8.66732 9.03485 8.66732 8.66665V5.33331ZM8.66732 10.6592C8.66732 10.291 8.36885 9.99251 8.00065 9.99251C7.63245 9.99251 7.33398 10.291 7.33398 10.6592V10.6666C7.33398 11.0348 7.63245 11.3333 8.00065 11.3333C8.36885 11.3333 8.66732 11.0348 8.66732 10.6666V10.6592Z"
          fill={fill}
        />
      </g>
      <defs>
        <clipPath id="clip0_444_48">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};

HighAlertIcon.propTypes = {
  width: PropTypes.string,
  height: PropTypes.string,
  className: PropTypes.string,
  fill: PropTypes.string,
};

export default HighAlertIcon;
