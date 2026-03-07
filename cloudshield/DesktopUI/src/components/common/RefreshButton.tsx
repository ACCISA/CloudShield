import { useState, type ButtonHTMLAttributes } from "react";

type RefreshButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {
  onClick?: () => void | Promise<void>;
};

const RefreshIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    <path d="M21 3v6h-6" />
  </svg>
);

export default function RefreshButton({
  onClick,
  disabled = false,
  className = "",
  ...rest
}: RefreshButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (!onClick || disabled || isLoading) return;

    setIsLoading(true);
    try {
      await onClick();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      aria-label="Refresh"
      {...rest}
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={`flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#101010] text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 ${className}`.trim()}
    >
      {isLoading ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      ) : (
        <RefreshIcon />
      )}
    </button>
  );
}
