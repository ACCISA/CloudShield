import PropTypes from "prop-types";

const ModerateAlertIcon = ({
  width = "16",
  height = "16",
  className = "",
  fill = "#EBAF60",
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
      <g clipPath="url(#clip0_444_42)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M7.33268 8.66667C7.33268 9.03487 7.63115 9.33333 7.99935 9.33333C8.36755 9.33333 8.66602 9.03487 8.66602 8.66667V6.66667C8.66602 6.29848 8.36755 6 7.99935 6C7.63115 6 7.33268 6.29848 7.33268 6.66667V8.66667ZM8.66602 10.6592C8.66602 10.291 8.36755 9.99253 7.99935 9.99253C7.63115 9.99253 7.33268 10.291 7.33268 10.6592V10.6667C7.33268 11.0349 7.63115 11.3333 7.99935 11.3333C8.36755 11.3333 8.66602 11.0349 8.66602 10.6667V10.6592ZM6.25092 3.10757C7.01295 1.73595 8.98555 1.73595 9.74755 3.10757L14.1482 11.0287C14.8888 12.3618 13.9248 14 12.3999 14H3.59858C2.07361 14 1.10968 12.3618 1.85026 11.0287L6.25092 3.10757Z"
          fill={fill}
        />
      </g>
      <defs>
        <clipPath id="clip0_444_42">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};

ModerateAlertIcon.propTypes = {
  width: PropTypes.string,
  height: PropTypes.string,
  className: PropTypes.string,
  fill: PropTypes.string,
};

export default ModerateAlertIcon;
