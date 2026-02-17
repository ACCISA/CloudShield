export interface EmptyStateProps {
  /** Main message to display */
  message: string;
  /** Optional icon to show above the message */
  icon?: React.ReactNode;
  /** Optional additional description below the message */
  description?: string;
  /** Test ID for testing purposes */
  testId?: string;
}

/**
 * EmptyState component for displaying "no data" messages
 * Use this when a fetch returns empty data (e.g., "No workstations found")
 */
export default function EmptyState({
  message,
  icon,
  description,
  testId = "empty-state",
}: EmptyStateProps) {
  return (
    <div
      data-testid={testId}
      className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-10 text-center"
    >
      {icon && (
        <div className="mb-4 text-white/40" data-testid={`${testId}-icon`}>
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-white/70" data-testid={`${testId}-message`}>
        {message}
      </p>
      {description && (
        <p
          className="mt-2 text-xs text-white/50"
          data-testid={`${testId}-description`}
        >
          {description}
        </p>
      )}
    </div>
  );
}
