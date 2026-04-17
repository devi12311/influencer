import { z } from "zod";

export const emailSchema = z.string().email().max(255);
export const usernameSchema = z
  .string()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9_]+$/, "Username may only include letters, numbers, and underscores.");
export const cuidSchema = z.string().cuid();
export const nonEmptyStringSchema = z.string().trim().min(1);

export const passwordSchema = z.string().min(10).max(128);
