import type { HTMLAttributes, PropsWithChildren } from "react";

type PanelProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>;

export default function Panel({
  children,
  className = "",
  ...rest
}: PanelProps) {
  return (
    <div
      {...rest}
      className={`rounded-2xl border border-white/10 bg-[#0f0f0f] shadow-[0_24px_64px_rgba(0,0,0,0.5)] ${className}`.trim()}
    >
      {children}
    </div>
  );
}
