"use server";

import { auth } from "@/server/auth";
import { db } from "@/server/db";

export async function updateUserTimezoneAction(formData: FormData) {
  const session = await auth();
  if (!session?.userId) {
    throw new Error("You must be signed in to update timezone settings.");
  }

  const timezone = String(formData.get("timezone") ?? "").trim() || null;
  await db.user.update({
    where: { id: session.userId },
    data: { timezone },
  });
}
