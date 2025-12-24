export default function UserAddIcon({ 
  width = 16, 
  height = 16, 
  color = "white",
  className = ""
}) {
  return (
    <svg 
      width={width} 
      height={height} 
      viewBox="0 0 16 16" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path 
        d="M12.3337 13H9.66699" 
        stroke={color} 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <path 
        d="M11 14.3333V11.6667" 
        stroke={color} 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <path 
        d="M8.10675 7.24667C8.04008 7.24 7.96008 7.24 7.88675 7.24667C6.30006 7.19334 5.04006 5.89334 5.04006 4.29334C5.0334 2.66 6.36006 1.33334 7.99342 1.33334C9.62675 1.33334 10.9534 2.66 10.9534 4.29334C10.9534 5.89334 9.68675 7.19334 8.10675 7.24667Z" 
        stroke={color} 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <path 
        d="M7.99333 14.5401C6.78 14.5401 5.57336 14.2334 4.65336 13.6201C3.04003 12.5401 3.04003 10.7801 4.65336 9.70674C6.48669 8.48007 9.49333 8.48007 11.3267 9.70674" 
        stroke={color} 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );
}