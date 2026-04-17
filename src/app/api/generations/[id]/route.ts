import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { getGenerationById } from "@/server/services/generation";
import { getPresignedUrl } from "@/server/services/media";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const generation = await getGenerationById({ id, userId: session.userId });

  return NextResponse.json({
    generation: {
      aspectRatio: generation.aspectRatio,
      errorMessage: generation.errorMessage,
      id: generation.id,
      imageSize: generation.imageSize,
      outputMediaUrl: generation.outputMedia ? await getPresignedUrl(generation.outputMedia, "medium") : null,
      promptSnapshot: generation.promptSnapshot,
      status: generation.status,
      tokensIn: generation.tokensIn,
      tokensOut: generation.tokensOut,
    },
  });
}
