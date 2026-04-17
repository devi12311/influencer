"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { signIn } from "@/actions/auth";
import { usernameSchema } from "@/lib/zod-schemas";
import { PasswordInput } from "@/components/auth/password-input";

const loginSchema = z.object({
  password: z.string().min(1, "Password is required."),
  username: usernameSchema,
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  return (
    <form
      className="space-y-5"
      onSubmit={handleSubmit(async (values) => {
        setFormError(null);
        const result = await signIn({ ...values, redirectTo });

        if (result.status === "error") {
          setFormError(result.message ?? "Unable to sign in.");
          return;
        }

        router.push(result.redirectTo ?? "/");
        router.refresh();
      })}
    >
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-slate-950">Sign in</h2>
        <p className="text-sm leading-6 text-slate-600">Use your username and password to access the app shell.</p>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Username</span>
        <input
          autoComplete="username"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 shadow-sm outline-none focus:border-slate-950"
          disabled={isSubmitting}
          {...register("username")}
        />
        {errors.username ? <p className="text-sm text-red-600">{errors.username.message}</p> : null}
      </label>

      <PasswordInput
        error={errors.password?.message}
        inputProps={{ autoComplete: "current-password", disabled: isSubmitting, ...register("password") }}
        label="Password"
      />

      {formError ? <p className="text-sm text-red-600">{formError}</p> : null}

      <button
        className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-sm text-slate-600">
        Need an account?{" "}
        <Link className="font-medium text-slate-950 underline" href="/signup">
          Sign up
        </Link>
      </p>
    </form>
  );
}
