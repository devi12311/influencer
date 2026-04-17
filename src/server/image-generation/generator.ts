export type GenerationAspectRatio = "1:1" | "4:5" | "5:4" | "9:16" | "16:9" | "2:3" | "3:2" | "3:4" | "4:3" | "21:9";
export type GenerationImageSize = "1K" | "2K";

export interface GenerateInput {
  aspectRatio?: GenerationAspectRatio;
  imageSize?: GenerationImageSize;
  model?: string;
  promptText: string;
  referenceMediaIds: string[];
}

export interface GenerateResult {
  imageBytes: Buffer;
  mimeType: string;
  synthId: boolean;
  tokensIn?: number;
  tokensOut?: number;
}

export interface ImageGenerator {
  generate(input: GenerateInput): Promise<GenerateResult>;
}
