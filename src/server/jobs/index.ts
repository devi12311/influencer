import { Worker } from "bullmq";
import { logger } from "@/server/logger";
import { createBullMqConnection } from "@/server/queue/connection";
import { closeQueues, queueNames } from "@/server/queue/queues";
import { createShutdownController } from "@/server/queue/worker-base";
import { enqueueRefreshScanJob, runRefreshTokenJob } from "@/server/jobs/refresh-token";

export interface WorkerRuntime {
  shutdown: (signal: NodeJS.Signals) => Promise<void>;
}

export async function bootWorkerRuntime(): Promise<WorkerRuntime> {
  await enqueueRefreshScanJob();

  const refreshWorker = new Worker(queueNames.refreshToken, async (job) => runRefreshTokenJob(job.data), {
    connection: createBullMqConnection(),
  });

  refreshWorker.on("failed", (job, error) => {
    logger.error({ err: error, jobId: job?.id, queue: queueNames.refreshToken }, "Worker job failed");
  });

  logger.info(
    {
      queues: [queueNames.refreshToken, queueNames.generateImage, queueNames.publishPost, queueNames.deriveThumbnails],
    },
    "Worker runtime booted with queue registry scaffold",
  );

  const shutdown = createShutdownController(async (signal) => {
    await refreshWorker.close();
    await closeQueues();
    logger.info({ signal }, "Worker runtime shutting down");
  });

  return {
    shutdown,
  };
}
