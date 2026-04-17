import { bootWorkerRuntime } from "@/server/jobs";
import { logger } from "@/server/logger";
import { createShutdownController } from "@/server/queue/worker-base";

async function main() {
  const runtime = await bootWorkerRuntime();
  const shutdown = createShutdownController(async (signal) => {
    await runtime.shutdown(signal);
    process.exit(0);
  });

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  logger.info("AI Influencer worker ready");
}

main().catch((error) => {
  logger.error({ err: error }, "Worker failed to boot");
  process.exit(1);
});
