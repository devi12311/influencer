"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { signUp } from "@/actions/auth";
import { emailSchema, usernameSchema } from "@/lib/zod-schemas";
import { PasswordInput } from "@/components/auth/password-input";

const signUpSchema = z
  .object({
    confirmPassword: z.string(),
    email: emailSchema,
    password: z.string().min(1),
    username: usernameSchema,
  })
  .refine((input) => input.password === input.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type SignUpValues = z.infer<typeof signUpSchema>;

export function SignUpForm({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
  });

  return (
    <form
      className="space-y-5"
      onSubmit={handleSubmit(async (values) => {
        setFormError(null);
        const result = await signUp({ ...values, redirectTo });

        if (result.status === "error") {
          setFormError(result.message ?? "Unable to create your account.");
          return;
        }

        router.push(result.redirectTo ?? "/");
        router.refresh();
      })}
    >
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-slate-950">Create an account</h2>
        <p className="text-sm leading-6 text-slate-600">Passwords must be 10+ characters, include a letter and a digit, and avoid common credentials.</p>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Email</span>
        <input
          autoComplete="email"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 shadow-sm outline-none focus:border-slate-950"
          disabled={isSubmitting}
          {...register("email")}
        />
        {errors.email ? <p className="text-sm text-red-600">{errors.email.message}</p> : null}
      </label>

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
        inputProps={{ autoComplete: "new-password", disabled: isSubmitting, ...register("password") }}
        label="Password"
      />
      <PasswordInput
        error={errors.confirmPassword?.message}
        inputProps={{ autoComplete: "new-password", disabled: isSubmitting, ...register("confirmPassword") }}
        label="Confirm password"
      />

      {formError ? <p className="text-sm text-red-600">{formError}</p> : null}

      <button
        className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Creating account…" : "Create account"}
      </button>

      <p className="text-sm text-slate-600">
        Already have an account?{" "}
        <Link className="font-medium text-slate-950 underline" href="/login">
          Sign in
        </Link>
      </p>
    </form>
  );
}
