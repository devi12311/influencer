import { Queue } from "bullmq";
import { createBullMqConnection } from "@/server/queue/connection";

export const queueNames = {
  refreshToken: "refresh-token",
  generateImage: "generate-image",
  publishPost: "publish-post",
  deriveThumbnails: "derive-thumbnails",
} as const;

export type QueueName = (typeof queueNames)[keyof typeof queueNames];

const registry = new Map<QueueName, Queue>();

export function getQueue(name: QueueName) {
  const existing = registry.get(name);
  if (existing) {
    return existing;
  }

  const queue = new Queue(name, {
    connection: createBullMqConnection(),
  });

  registry.set(name, queue);
  return queue;
}

export async function closeQueues() {
  await Promise.all(Array.from(registry.values(), (queue) => queue.close()));
  registry.clear();
}
