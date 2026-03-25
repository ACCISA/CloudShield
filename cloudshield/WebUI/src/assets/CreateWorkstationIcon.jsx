export default function MonitorIcon({ 
  width = 16, 
  height = 16, 
  color = "currentColor", // Changed from "white" to "currentColor"
  className = ""
}) {
  return (
    <svg 
      width={width} 
      height={height} 
      viewBox="0 0 13 13" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path 
        d="M4.5 1.16666H1.83333C1.09695 1.16666 0.5 1.76362 0.5 2.5V7.83333C0.5 8.56973 1.09695 9.16666 1.83333 9.16666H9.83333C10.5697 9.16666 11.1667 8.56973 11.1667 7.83333V7.16666" 
        stroke={color} 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <path 
        d="M9.47639 1.83333C9.96986 1.83333 10.4007 2.10142 10.6313 2.49989M9.47639 1.83333C8.98293 1.83333 8.55206 2.10141 8.32153 2.49989M9.47639 1.83333V0.5M10.6313 2.49989L11.7858 1.83333M10.6313 2.49989C10.7448 2.69603 10.8097 2.92377 10.8097 3.16667C10.8097 3.42255 10.7433 3.64648 10.6313 3.83347M8.32153 2.49989L7.16699 1.83333M8.32153 2.49989C8.20799 2.69603 8.14306 2.92376 8.14306 3.16667C8.14306 3.40957 8.20799 3.63731 8.32153 3.83345M9.47639 5.83333V4.47783M9.47639 4.47783C9.03213 4.48677 8.58399 4.28717 8.32153 3.83345M9.47639 4.47783C9.93506 4.46861 10.3895 4.2371 10.6313 3.83347M7.16699 4.5L8.32153 3.83345M11.7858 4.5L10.6313 3.83347" 
        stroke={color} 
        strokeLinecap="round"
      />
      <path 
        d="M5.83301 9.16666V11.8333" 
        stroke={color} 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <path 
        d="M3.16699 11.8333H8.50033" 
        stroke={color} 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );
}