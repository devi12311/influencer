import { hash, verify } from "@node-rs/argon2";
import { COMMON_PASSWORDS } from "@/lib/common-passwords";

const PASSWORD_MIN_LENGTH = 10;
const PASSWORD_MAX_LENGTH = 128;

const ARGON_OPTIONS = {
  algorithm: 2,
  memoryCost: 19_456,
  parallelism: 1,
  timeCost: 2,
} as const;

export function validatePasswordPolicy(password: string) {
  const errors: string[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`);
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    errors.push(`Password must be at most ${PASSWORD_MAX_LENGTH} characters long.`);
  }

  if (!/[A-Za-z]/.test(password)) {
    errors.push("Password must contain at least one letter.");
  }

  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one digit.");
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push("Password is too common. Choose a more unique password.");
  }

  return {
    success: errors.length === 0,
    errors,
  };
}

export async function hashPassword(password: string) {
  return hash(password, ARGON_OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string) {
  return verify(passwordHash, password, ARGON_OPTIONS);
}
