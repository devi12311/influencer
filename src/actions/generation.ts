"use server";

import { auth } from "@/server/auth";
import { createAndEnqueueGeneration } from "@/server/services/generation";

export async function generateImage(input: {
  aspectRatio?: "1:1" | "4:5" | "5:4" | "9:16" | "16:9" | "2:3" | "3:2" | "3:4" | "4:3" | "21:9";
  imageSize?: "1K" | "2K";
  influencerId: string;
  promptId: string;
}) {
  const session = await auth();

  if (!session?.userId) {
    throw new Error("You must be signed in to generate images.");
  }

  const generationId = await createAndEnqueueGeneration({
    aspectRatio: input.aspectRatio,
    imageSize: input.imageSize,
    influencerId: input.influencerId,
    promptId: input.promptId,
    userId: session.userId,
  });

  return { generationId };
}
