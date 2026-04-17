import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const isProduction = process.env.NODE_ENV === "production";
const devMasterKey = Buffer.from("ai-influencer-dev-master-key-32-bytes!!").toString("base64");

function withHttpProtocol(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return trimmed;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `http://${trimmed}`;
}

const optionalSecret = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().min(1).optional());

const requiredSecret = (fallback: string) =>
  z.preprocess((value) => {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }

    if (!isProduction) {
      return fallback;
    }

    return value;
  }, z.string().min(1));

const normalizedUrl = z.preprocess(withHttpProtocol, z.string().url());

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().url(),
    MINIO_ENDPOINT: normalizedUrl,
    MINIO_ACCESS_KEY: z.string().min(1),
    MINIO_SECRET_KEY: z.string().min(1),
    MINIO_BUCKET: z.string().min(1),
    MINIO_REGION: z.string().min(1),
    MINIO_PUBLIC_BASE_URL: normalizedUrl,
    AUTH_SECRET: requiredSecret("ai-influencer-dev-auth-secret"),
    AUTH_URL: z.string().url(),
    MASTER_KEY: requiredSecret(devMasterKey),
    GOOGLE_GENAI_API_KEY: optionalSecret,
    INSTAGRAM_CLIENT_ID: optionalSecret,
    INSTAGRAM_CLIENT_SECRET: optionalSecret,
    INSTAGRAM_REDIRECT_URI: z.string().url(),
    FACEBOOK_APP_ID: optionalSecret,
    FACEBOOK_APP_SECRET: optionalSecret,
    FACEBOOK_REDIRECT_URI: z.string().url(),
    THREADS_APP_ID: optionalSecret,
    THREADS_APP_SECRET: optionalSecret,
    THREADS_REDIRECT_URI: z.string().url(),
    TIKTOK_CLIENT_KEY: optionalSecret,
    TIKTOK_CLIENT_SECRET: optionalSecret,
    TIKTOK_REDIRECT_URI: z.string().url(),
  },
  experimental__runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    MINIO_ENDPOINT: process.env.MINIO_ENDPOINT,
    MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY,
    MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY,
    MINIO_BUCKET: process.env.MINIO_BUCKET,
    MINIO_REGION: process.env.MINIO_REGION,
    MINIO_PUBLIC_BASE_URL: process.env.MINIO_PUBLIC_BASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
    MASTER_KEY: process.env.MASTER_KEY,
    GOOGLE_GENAI_API_KEY: process.env.GOOGLE_GENAI_API_KEY,
    INSTAGRAM_CLIENT_ID: process.env.INSTAGRAM_CLIENT_ID,
    INSTAGRAM_CLIENT_SECRET: process.env.INSTAGRAM_CLIENT_SECRET,
    INSTAGRAM_REDIRECT_URI: process.env.INSTAGRAM_REDIRECT_URI,
    FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID,
    FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET,
    FACEBOOK_REDIRECT_URI: process.env.FACEBOOK_REDIRECT_URI,
    THREADS_APP_ID: process.env.THREADS_APP_ID,
    THREADS_APP_SECRET: process.env.THREADS_APP_SECRET,
    THREADS_REDIRECT_URI: process.env.THREADS_REDIRECT_URI,
    TIKTOK_CLIENT_KEY: process.env.TIKTOK_CLIENT_KEY,
    TIKTOK_CLIENT_SECRET: process.env.TIKTOK_CLIENT_SECRET,
    TIKTOK_REDIRECT_URI: process.env.TIKTOK_REDIRECT_URI,
  },
  emptyStringAsUndefined: true,
});
