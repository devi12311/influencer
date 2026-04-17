import { Worker } from "bullmq";
import { runDeriveThumbnailsJob } from "@/server/jobs/derive-thumbnails";
import { runGenerateImageJob } from "@/server/jobs/generate-image";
import { runPublishPostJob } from "@/server/jobs/publish-post";
import { enqueueRefreshScanJob, runRefreshTokenJob } from "@/server/jobs/refresh-token";
import { logger } from "@/server/logger";
import { createBullMqConnection } from "@/server/queue/connection";
import { closeQueues, queueNames } from "@/server/queue/queues";
import { createShutdownController } from "@/server/queue/worker-base";

export interface WorkerRuntime {
  shutdown: (signal: NodeJS.Signals) => Promise<void>;
}

export async function bootWorkerRuntime(): Promise<WorkerRuntime> {
  await enqueueRefreshScanJob();

  const refreshWorker = new Worker(queueNames.refreshToken, async (job) => runRefreshTokenJob(job.data), {
    connection: createBullMqConnection(),
  });
  const deriveThumbnailsWorker = new Worker(queueNames.deriveThumbnails, async (job) => runDeriveThumbnailsJob(job.data), {
    connection: createBullMqConnection(),
  });
  const generateImageWorker = new Worker(queueNames.generateImage, async (job) => runGenerateImageJob(job.data), {
    connection: createBullMqConnection(),
  });
  const publishPostWorker = new Worker(queueNames.publishPost, async (job) => runPublishPostJob(job.data), {
    connection: createBullMqConnection(),
  });

  for (const [queueName, worker] of [
    [queueNames.refreshToken, refreshWorker],
    [queueNames.deriveThumbnails, deriveThumbnailsWorker],
    [queueNames.generateImage, generateImageWorker],
    [queueNames.publishPost, publishPostWorker],
  ] as const) {
    worker.on("failed", (job, error) => {
      logger.error({ err: error, jobId: job?.id, queue: queueName }, "Worker job failed");
    });
  }

  logger.info(
    {
      queues: [queueNames.refreshToken, queueNames.generateImage, queueNames.publishPost, queueNames.deriveThumbnails],
    },
    "Worker runtime booted with queue registry scaffold",
  );

  const shutdown = createShutdownController(async (signal) => {
    await Promise.all([refreshWorker.close(), deriveThumbnailsWorker.close(), generateImageWorker.close(), publishPostWorker.close()]);
    await closeQueues();
    logger.info({ signal }, "Worker runtime shutting down");
  });

  return { shutdown };
}
