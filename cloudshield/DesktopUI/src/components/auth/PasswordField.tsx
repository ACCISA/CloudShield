import { useState, type ChangeEvent, type KeyboardEvent } from "react";
import AuthTextField from "./AuthTextField";

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
          className="text-xs font-medium text-white/70 underline"
        >
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
