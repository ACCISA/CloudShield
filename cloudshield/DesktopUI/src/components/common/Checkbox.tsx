type CheckboxProps = {
  checked?: boolean;
  indeterminate?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
};

export default function Checkbox({
  checked = false,
  indeterminate = false,
  onChange,
  disabled = false,
  ariaLabel = "Toggle selection",
}: CheckboxProps) {
  const isActive = checked || indeterminate;

  return (
    <button
      type="button"
      role="checkbox"
      aria-label={ariaLabel}
      aria-checked={indeterminate ? "mixed" : checked}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={() => {
        if (!disabled) {
          onChange?.(!checked);
        }
      }}
      className={`inline-flex h-[18px] w-[18px] items-center justify-center rounded border-2 transition ${
        isActive
          ? "border-white bg-white text-black"
          : "border-white/50 bg-transparent text-black"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      {checked && !indeterminate ? (
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
          <path
            d="M13.3333 4L6 11.3333L2.66666 8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}

      {indeterminate ? (
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
          <path
            d="M4 8H12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ) : null}
    </button>
  );
}
