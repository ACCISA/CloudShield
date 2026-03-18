import type { ChangeEvent, InputHTMLAttributes, ReactNode } from "react";

type AuthTextFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange"
> & {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  endAdornment?: ReactNode;
};

export default function AuthTextField({
  label,
  value,
  onChange,
  endAdornment,
  className = "",
  ...rest
}: AuthTextFieldProps) {
  return (
    <div className="mb-2 w-full">
      {label ? (
        <label className="mb-1.5 block text-sm font-medium text-white">
          {label}
        </label>
      ) : null}

      <div className="relative">
        <input
          {...rest}
          value={value}
          onChange={onChange}
          className={`w-full rounded-lg border border-white/15 bg-[#161616] px-3 py-3 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-white/35 focus:bg-[#1a1a1a] ${endAdornment ? "pr-12" : ""} ${className}`.trim()}
        />

        {endAdornment ? (
          <div className="absolute inset-y-0 right-3 flex items-center text-white/70">
            {endAdornment}
          </div>
        ) : null}
      </div>
    </div>
  );
}
