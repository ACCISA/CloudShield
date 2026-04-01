import { useState, type ChangeEvent, type KeyboardEvent } from "react";
import AuthTextField from "./AuthTextField";

const EyeOpenIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeClosedIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

type PasswordFieldProps = {
  label?: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
};

export default function PasswordField({
  label = "Password",
  value,
  onChange,
  onKeyDown,
  placeholder = "********",
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-sm font-medium text-white">{label}</label>
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="inline-flex items-center gap-1 text-xs font-medium text-white/70"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <EyeOpenIcon /> : <EyeClosedIcon />}
          {showPassword ? "Hide" : "Show"}
        </button>
      </div>

      <AuthTextField
        label=""
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        type={showPassword ? "text" : "password"}
        placeholder={placeholder}
        className="mt-0"
      />
    </div>
  );
}
