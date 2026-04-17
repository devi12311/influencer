"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { changePassword, revokeAllSessions } from "@/actions/auth";
import { PasswordInput } from "@/components/auth/password-input";

const changePasswordSchema = z
  .object({
    confirmPassword: z.string(),
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z.string().min(1, "New password is required."),
  })
  .refine((input) => input.newPassword === input.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export function SettingsSecurityForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
  });

  return (
    <div className="space-y-8">
      <form
        className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6"
        onSubmit={handleSubmit(async (values) => {
          setMessage(null);
          setError(null);
          const result = await changePassword(values);

          if (result.status === "error") {
            setError(result.message ?? "Unable to change your password.");
            return;
          }

          setMessage(result.message ?? "Password updated.");
          router.push(result.redirectTo ?? "/login");
          router.refresh();
        })}
      >
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-slate-950">Change password</h2>
          <p className="text-sm text-slate-600">Updating your password signs out all active sessions.</p>
        </div>

        <PasswordInput
          error={errors.currentPassword?.message}
          inputProps={{ autoComplete: "current-password", disabled: isSubmitting, ...register("currentPassword") }}
          label="Current password"
        />
        <PasswordInput
          error={errors.newPassword?.message}
          inputProps={{ autoComplete: "new-password", disabled: isSubmitting, ...register("newPassword") }}
          label="New password"
        />
        <PasswordInput
          error={errors.confirmPassword?.message}
          inputProps={{ autoComplete: "new-password", disabled: isSubmitting, ...register("confirmPassword") }}
          label="Confirm new password"
        />

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}

        <button
          className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Updating…" : "Update password"}
        </button>
      </form>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-slate-950">Session control</h2>
          <p className="text-sm text-slate-600">Revoke all active sessions across browsers and devices.</p>
        </div>
        <button
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={revoking}
          onClick={async () => {
            setRevoking(true);
            setMessage(null);
            setError(null);
            const result = await revokeAllSessions();
            setRevoking(false);

            if (result.status === "error") {
              setError(result.message ?? "Unable to revoke sessions.");
              return;
            }

            router.push(result.redirectTo ?? "/login");
            router.refresh();
          }}
          type="button"
        >
          {revoking ? "Revoking…" : "Revoke all sessions"}
        </button>
      </section>
    </div>
  );
}
