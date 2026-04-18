import { GoogleGenAI, createPartFromBase64 } from "@google/genai";
import type { ImageGenerator, GenerateInput } from "@/server/image-generation/generator";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { readObjectBytes } from "@/server/storage/minio";

const DEFAULT_MODEL = "gemini-2.5-flash-image";

export class NanoBananaGenerator implements ImageGenerator {
  private readonly client: GoogleGenAI;

  constructor() {
    if (!env.GOOGLE_GENAI_API_KEY) {
      throw new Error("GOOGLE_GENAI_API_KEY is required to generate images.");
    }

    this.client = new GoogleGenAI({ apiKey: env.GOOGLE_GENAI_API_KEY });
  }

  async generate(input: GenerateInput) {
    const referenceMedia = await db.mediaObject.findMany({
      where: {
        id: { in: input.referenceMediaIds },
      },
      orderBy: { createdAt: "asc" },
    });

    const mediaById = new Map(referenceMedia.map((media) => [media.id, media]));
    const parts: Array<string | ReturnType<typeof createPartFromBase64>> = [input.promptText];

    for (const referenceMediaId of input.referenceMediaIds) {
      const media = mediaById.get(referenceMediaId);
      if (!media) {
        continue;
      }
      const imageBytes = await readObjectBytes(media.objectKey);
      parts.push(createPartFromBase64(imageBytes.toString("base64"), media.mimeType));
    }

    const response = await this.client.models.generateContent({
      config: {
        imageConfig: {
          aspectRatio: input.aspectRatio ?? "4:5",
          imageSize: input.imageSize ?? "2K",
        },
        responseModalities: ["IMAGE"],
      },
      contents: parts,
      model: input.model ?? DEFAULT_MODEL,
    });

    const imageData = response.data;

    if (!imageData) {
      throw new Error("Nano Banana response did not contain image data.");
    }

    return {
      imageBytes: Buffer.from(imageData, "base64"),
      mimeType: "image/png",
      synthId: true,
      tokensIn: response.usageMetadata?.promptTokenCount,
      tokensOut: response.usageMetadata?.candidatesTokenCount,
    };
  }
}

let generator: NanoBananaGenerator | null = null;

export function getNanoBananaGenerator() {
  if (!generator) {
    generator = new NanoBananaGenerator();
  }

  return generator;
}
