import { randomUUID } from "node:crypto";
import { db } from "@/server/db";

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function createSessionExpiryDate() {
  return new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
}

export async function createSessionRecord(userId: string) {
  const session = await db.session.create({
    data: {
      userId,
      sessionToken: randomUUID(),
      expiresAt: createSessionExpiryDate(),
    },
  });

  return session;
}

export async function getSessionRecord(sessionToken: string) {
  return db.session.findUnique({
    where: { sessionToken },
    include: { user: true },
  });
}

export async function deleteSessionRecord(sessionToken: string) {
  await db.session.deleteMany({
    where: { sessionToken },
  });
}

export async function deleteAllSessionsForUser(userId: string) {
  await db.session.deleteMany({
    where: { userId },
  });
}
