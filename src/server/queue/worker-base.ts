export type ShutdownHandler = (signal: NodeJS.Signals) => Promise<void>;

export function createShutdownController(handler: ShutdownHandler) {
  let shuttingDown = false;

  return async (signal: NodeJS.Signals) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    await handler(signal);
  };
}
