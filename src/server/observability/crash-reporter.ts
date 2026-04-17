import { logger } from "@/server/logger";

export function reportServerError(error: unknown, context?: Record<string, unknown>) {
  logger.error({ err: error, ...context }, "Server error captured");

  if (process.env.SENTRY_DSN) {
    logger.info({ hasSentryDsn: true }, "Crash reporter stub invoked");
  }
}
