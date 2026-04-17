"use client";

import type { InputHTMLAttributes } from "react";
import { useId, useState } from "react";
import { cn } from "@/lib/cn";

interface PasswordInputProps {
  error?: string;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
  label: string;
}

export function PasswordInput({ error, inputProps, label }: PasswordInputProps) {
  const generatedId = useId();
  const [showPassword, setShowPassword] = useState(false);
  const resolvedId = inputProps?.id ?? generatedId;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700" htmlFor={resolvedId}>
        {label}
      </label>
      <div className="flex rounded-xl border border-slate-300 bg-white shadow-sm focus-within:border-slate-950">
        <input
          {...inputProps}
          className={cn(
            "w-full rounded-l-xl border-0 bg-transparent px-4 py-3 text-sm text-slate-950 outline-none",
            inputProps?.className,
          )}
          id={resolvedId}
          type={showPassword ? "text" : "password"}
        />
        <button
          aria-label={showPassword ? `Hide ${label}` : `Show ${label}`}
          className="rounded-r-xl px-4 text-sm font-medium text-slate-500 transition hover:text-slate-950"
          onClick={(event) => {
            event.preventDefault();
            setShowPassword((value) => !value);
          }}
          type="button"
        >
          {showPassword ? "Hide" : "Show"}
        </button>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
