import pino from "pino";

declare global {
  var aiInfluencerLogger: pino.Logger | undefined;
}

export const logger =
  globalThis.aiInfluencerLogger ??
  pino({
    name: "ai-influencer",
    level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "development" ? "debug" : "info"),
    transport:
      process.env.NODE_ENV === "development"
        ? {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:standard",
            },
          }
        : undefined,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.aiInfluencerLogger = logger;
}

export function withRequestLogger(requestId: string) {
  return logger.child({ requestId });
}
