import { createHash } from "node:crypto";
import sharp from "sharp";
import { getNanoBananaGenerator } from "@/server/image-generation/nano-banana";
import { getQueue, queueNames } from "@/server/queue/queues";
import { uploadObject } from "@/server/storage/minio";
import {
  completeGeneration,
  createGeneratedMediaObject,
  failGeneration,
  getGenerationJobData,
  markGenerationRunning,
} from "@/server/services/generation";

export async function runGenerateImageJob(input: { generationId: string }) {
  await markGenerationRunning(input.generationId);

  try {
    const generation = await getGenerationJobData(input.generationId);
    const result = await getNanoBananaGenerator().generate({
      aspectRatio: generation.aspectRatio as never,
      imageSize: generation.imageSize as never,
      model: generation.model,
      promptText: generation.promptSnapshot,
      referenceMediaIds: generation.inputMediaIds,
    });

    const metadata = await sharp(result.imageBytes).metadata();
    const objectKey = `users/${generation.userId}/generations/${generation.id}.png`;
    await uploadObject(objectKey, result.imageBytes, result.mimeType);

    const mediaObject = await createGeneratedMediaObject({
      contentHash: createHash("sha256").update(result.imageBytes).digest("hex"),
      height: metadata.height,
      mimeType: result.mimeType,
      objectKey,
      sizeBytes: BigInt(result.imageBytes.byteLength),
      synthId: result.synthId,
      userId: generation.userId,
      width: metadata.width,
    });

    await completeGeneration({
      generationId: generation.id,
      mediaObjectId: mediaObject.id,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
    });

    await getQueue(queueNames.deriveThumbnails).add(queueNames.deriveThumbnails, { mediaObjectId: mediaObject.id });
    return mediaObject.id;
  } catch (caughtError) {
    await failGeneration({
      errorMessage: caughtError instanceof Error ? caughtError.message : String(caughtError),
      generationId: input.generationId,
    });
    throw caughtError;
  }
}
