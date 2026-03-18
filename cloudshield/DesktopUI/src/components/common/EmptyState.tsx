import type { ReactNode } from "react";

type EmptyStateProps = {
  message: string;
  description?: string;
  icon?: ReactNode;
};

export default function EmptyState({
  message,
  description,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-10 text-center">
      {icon ? <div className="mb-4 text-white/40">{icon}</div> : null}
      <p className="text-sm font-medium text-white/75">{message}</p>
      {description ? (
        <p className="mt-2 text-xs text-white/50">{description}</p>
      ) : null}
    </div>
  );
}
