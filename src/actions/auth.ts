"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { z } from "zod";
import { auth, signIn as authSignIn, signOut as authSignOut } from "@/server/auth";
import { getRedisConnection } from "@/server/queue/connection";
import { clearFailedSignIns, isRateLimited } from "@/server/auth/rate-limit";
import { deleteAllSessionsForUser, deleteSessionRecord } from "@/server/auth/session-store";
import { getClientIpAddress, normalizeRedirectTarget } from "@/server/auth/request";
import { validatePasswordPolicy, verifyPassword } from "@/server/auth/password";
import { db } from "@/server/db";
import { createUser, updateUserPassword } from "@/server/services/user-auth";
import { emailSchema, usernameSchema } from "@/lib/zod-schemas";

const signUpSchema = z
  .object({
    confirmPassword: z.string(),
    email: emailSchema,
    password: z.string(),
    redirectTo: z.string().optional(),
    username: usernameSchema,
  })
  .superRefine((input, ctx) => {
    const passwordValidation = validatePasswordPolicy(input.password);
    for (const message of passwordValidation.errors) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message,
        path: ["password"],
      });
    }

    if (input.password !== input.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match.",
        path: ["confirmPassword"],
      });
    }
  });

const signInSchema = z.object({
  password: z.string().min(1, "Password is required."),
  redirectTo: z.string().optional(),
  username: usernameSchema,
});

const changePasswordSchema = z
  .object({
    confirmPassword: z.string(),
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z.string(),
  })
  .superRefine((input, ctx) => {
    const passwordValidation = validatePasswordPolicy(input.newPassword);
    for (const message of passwordValidation.errors) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message,
        path: ["newPassword"],
      });
    }

    if (input.newPassword !== input.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match.",
        path: ["confirmPassword"],
      });
    }
  });

export interface ActionResult {
  fieldErrors?: Record<string, string[]>;
  message?: string;
  redirectTo?: string;
  status: "error" | "success";
  statusCode?: number;
}

function flattenZodError(error: z.ZodError) {
  return error.flatten().fieldErrors;
}

export async function signUp(input: unknown): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return {
      fieldErrors: flattenZodError(parsed.error),
      status: "error",
      statusCode: 400,
    };
  }

  const createdUser = await createUser({
    email: parsed.data.email.toLowerCase(),
    password: parsed.data.password,
    username: parsed.data.username,
  });

  if (!createdUser) {
    return {
      message: "Unable to create that account. Please try different credentials.",
      status: "error",
      statusCode: 409,
    };
  }

  return signIn({
    password: parsed.data.password,
    redirectTo: parsed.data.redirectTo,
    username: parsed.data.username,
  });
}

export async function signIn(input: unknown): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(input);

  if (!parsed.success) {
    return {
      fieldErrors: flattenZodError(parsed.error),
      status: "error",
      statusCode: 400,
    };
  }

  const requestHeaders = await headers();
  const identity = {
    ipAddress: getClientIpAddress(requestHeaders),
    username: parsed.data.username,
  };

  if (await isRateLimited(getRedisConnection(), identity)) {
    return {
      message: "Too many failed attempts. Try again in 15 minutes.",
      status: "error",
      statusCode: 403,
    };
  }

  try {
    await authSignIn("credentials", {
      password: parsed.data.password,
      redirect: false,
      redirectTo: normalizeRedirectTarget(parsed.data.redirectTo),
      username: parsed.data.username,
    });

    await clearFailedSignIns(getRedisConnection(), identity);

    return {
      redirectTo: normalizeRedirectTarget(parsed.data.redirectTo),
      status: "success",
    };
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        message: "Invalid username or password.",
        status: "error",
        statusCode: 401,
      };
    }

    throw error;
  }
}

export async function signOut(): Promise<ActionResult> {
  const session = await auth();

  if (session?.sessionToken) {
    await deleteSessionRecord(session.sessionToken);
  }

  await authSignOut({
    redirect: false,
    redirectTo: "/login",
  });

  return {
    redirectTo: "/login",
    status: "success",
  };
}

export async function revokeAllSessions(): Promise<ActionResult> {
  const session = await auth();

  if (!session?.userId) {
    return {
      message: "You must be signed in to revoke sessions.",
      status: "error",
      statusCode: 401,
    };
  }

  await deleteAllSessionsForUser(session.userId);
  await authSignOut({
    redirect: false,
    redirectTo: "/login",
  });

  return {
    message: "All sessions revoked.",
    redirectTo: "/login",
    status: "success",
  };
}

export async function changePassword(input: unknown): Promise<ActionResult> {
  const parsed = changePasswordSchema.safeParse(input);

  if (!parsed.success) {
    return {
      fieldErrors: flattenZodError(parsed.error),
      status: "error",
      statusCode: 400,
    };
  }

  const session = await auth();

  if (!session?.userId) {
    return {
      message: "You must be signed in to update your password.",
      status: "error",
      statusCode: 401,
    };
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
  });

  if (!user) {
    return {
      message: "User account not found.",
      status: "error",
      statusCode: 404,
    };
  }

  const matchesCurrentPassword = await verifyPassword(user.passwordHash, parsed.data.currentPassword);

  if (!matchesCurrentPassword) {
    return {
      message: "Current password is incorrect.",
      status: "error",
      statusCode: 400,
    };
  }

  await updateUserPassword(user.id, parsed.data.newPassword);
  await deleteAllSessionsForUser(user.id);
  await authSignOut({
    redirect: false,
    redirectTo: "/login",
  });

  return {
    message: "Password updated. Please sign in again.",
    redirectTo: "/login",
    status: "success",
  };
}
