import type { ChangeEvent, InputHTMLAttributes } from "react";

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
  return (
    <div
      className={`relative w-full max-w-sm rounded-xl border border-white/10 bg-[#0f0f0f] transition focus-within:border-white/30 hover:border-white/20 ${className}`.trim()}
    >
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
        <SearchIcon />
      </span>
      <input
        {...rest}
        value={value}
        onChange={onChange}
        className="w-full bg-transparent py-2.5 pl-10 pr-3 text-sm text-white/80 placeholder:text-white/40 outline-none"
      />
    </div>
  );
}
