import {
  useEffect,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
} from "react";

type SearchFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange"
> & {
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

const SearchIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

export default function SearchField({
  value,
  onChange,
  className = "",
  ...rest
}: SearchFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 600 : false,
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 600);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div
      className={`relative flex h-12 items-center rounded-lg px-6 transition-all duration-200 ${isMobile ? "w-full" : "w-90"} ${className}`.trim()}
      style={{
        backgroundColor: isFocused || isHovered ? "#151515" : "#111111",
        border: `1px solid ${isFocused || isHovered ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.10)"}`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className="pointer-events-none mr-2 text-white/50">
        <SearchIcon />
      </span>
      <input
        {...rest}
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="w-full bg-transparent text-base font-medium text-white/80 placeholder:text-white/40 outline-none"
      />
    </div>
  );
}
