import { logger } from "@/server/logger";

export interface WorkerRuntime {
  shutdown: (signal: NodeJS.Signals) => Promise<void>;
}

export async function bootWorkerRuntime(): Promise<WorkerRuntime> {
  logger.info(
    {
      queues: ["refresh-token", "generate-image", "publish-post", "derive-thumbnails"],
    },
    "Worker runtime booted with queue registry scaffold",
  );

  const keepAlive = setInterval(() => {
    logger.debug("Worker heartbeat");
  }, 60_000);

  return {
    shutdown: async (signal) => {
      clearInterval(keepAlive);
      logger.info({ signal }, "Worker runtime shutting down");
    },
  };
}
