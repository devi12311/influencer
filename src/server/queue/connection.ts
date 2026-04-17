import IORedis from "ioredis";
import { env } from "@/server/env";

declare global {
  var aiInfluencerRedis: IORedis | undefined;
}

function createRedisClient() {
  return new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

export function getRedisConnection() {
  if (!globalThis.aiInfluencerRedis) {
    globalThis.aiInfluencerRedis = createRedisClient();
  }

  return globalThis.aiInfluencerRedis;
}

export function createBullMqConnection() {
  return createRedisClient();
}
