export default function WorkstationsIcon({
  selected = false,
  width = 17,
  height = 17,
  className = "",
}) {
  const color = selected ? "#fff" : "#BCBCBC";
  const fillOpacity = selected ? "1" : "0";

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 17 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M10.7237 16.4036H15.2676C15.895 16.4036 16.4036 15.895 16.4036 15.2676V1.63597C16.4036 1.00859 15.895 0.5 15.2676 0.5H10.7237C10.0964 0.5 9.58776 1.00859 9.58776 1.63597V15.2676C9.58776 15.895 10.0964 16.4036 10.7237 16.4036ZM10.7237 16.4036H4.4759M7.31582 12.9957V16.4036M9.58776 6.17985H16.4036M11.2917 12.9957H14.6996M1.63597 3.90791H9.58776V12.9957H1.63597C1.00859 12.9957 0.5 12.4871 0.5 11.8597V5.04388C0.5 4.41651 1.00859 3.90791 1.63597 3.90791Z"
        stroke={color}
        fill={color}
        fillOpacity={fillOpacity}
      />
    </svg>
  );
}
