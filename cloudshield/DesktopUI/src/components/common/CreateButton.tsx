import type { ButtonHTMLAttributes, ReactNode } from "react";

type CreateButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  buttonText?: string;
};

const DefaultCreateIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
);

export default function CreateButton({
  icon = <DefaultCreateIcon />,
  buttonText = "Create",
  className = "",
  ...rest
}: CreateButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      className={`flex items-center gap-2 rounded-xl border border-white/10 bg-[#101010] px-4 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 ${className}`.trim()}
    >
      {icon}
      {buttonText}
    </button>
  );
}
