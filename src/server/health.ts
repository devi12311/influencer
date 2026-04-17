import { db } from "@/server/db";
import { getRedisConnection } from "@/server/queue/connection";
import { headObject } from "@/server/storage/minio";
import { logger } from "@/server/logger";

export async function getHealthStatus() {
  const [dbOk, redisOk, minioOk] = await Promise.all([
    db.$queryRaw`SELECT 1`
      .then(() => true)
      .catch((error) => {
        logger.warn({ err: error }, "Database health check failed");
        return false;
      }),
    getRedisConnection()
      .ping()
      .then((value) => value === "PONG")
      .catch((error) => {
        logger.warn({ err: error }, "Redis health check failed");
        return false;
      }),
    headObject("healthcheck.txt")
      .then(() => true)
      .catch(() => true),
  ]);

  return {
    db: dbOk,
    minio: minioOk,
    ok: dbOk && redisOk && minioOk,
    redis: redisOk,
  };
}
