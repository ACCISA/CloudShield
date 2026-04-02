import { useState, type ButtonHTMLAttributes } from "react";
import RefreshIcon from "../../assets/RefreshIcon";

type RefreshButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {
  onClick?: () => void | Promise<void>;
};

export default function RefreshButton({
  onClick,
  disabled = false,
  className = "",
  ...rest
}: RefreshButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title="Refresh"
      className={`flex h-12 w-12 items-center justify-center rounded-[80px] border-0 bg-transparent text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`.trim()}
      style={{
        backgroundColor:
          isHovered && !disabled && !isLoading ? "rgba(255,255,255,0.08)" : "transparent",
      }}
    >
      {isLoading ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      ) : (
        <RefreshIcon width={20} height={20} color="currentColor" />
      )}
    </button>
  );
}
