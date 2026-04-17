import { createHash, createHmac, randomBytes } from "node:crypto";
import type { SocialPlatform } from "@prisma/client";
import { env } from "@/server/env";
import { getRedisConnection } from "@/server/queue/connection";

const OAUTH_STATE_TTL_SECONDS = 10 * 60;

function base64Url(input: Buffer) {
  return input.toString("base64url");
}

function signPayload(payload: string) {
  return createHmac("sha256", env.AUTH_SECRET).update(payload).digest("base64url");
}

function createCodeVerifier() {
  return base64Url(randomBytes(32));
}

function createCodeChallenge(codeVerifier: string) {
  return createHash("sha256").update(codeVerifier).digest("base64url");
}

export async function createState(userId: string, platform: SocialPlatform) {
  const redis = getRedisConnection();
  const state = base64Url(randomBytes(24));
  const codeVerifier = createCodeVerifier();
  const payload = JSON.stringify({ codeVerifier, platform, userId });
  const signature = signPayload(payload);

  await redis.set(`oauth:state:${state}`, JSON.stringify({ payload, signature }), "EX", OAUTH_STATE_TTL_SECONDS);

  return {
    codeChallenge: createCodeChallenge(codeVerifier),
    state,
  };
}

export async function consumeState(state: string) {
  const redis = getRedisConnection();
  const key = `oauth:state:${state}`;
  const stored = await redis.get(key);

  if (!stored) {
    throw new Error("OAuth state is missing or expired.");
  }

  await redis.del(key);

  const parsed = JSON.parse(stored) as { payload: string; signature: string };

  if (parsed.signature !== signPayload(parsed.payload)) {
    throw new Error("OAuth state signature is invalid.");
  }

  const payload = JSON.parse(parsed.payload) as {
    codeVerifier: string;
    platform: SocialPlatform;
    userId: string;
  };

  return payload;
}
