import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { getTikTokCreatorInfo } from "@/server/providers/tiktok/publisher";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get("connectionId");

  if (!connectionId) {
    return NextResponse.json({ error: "missing_connection_id" }, { status: 400 });
  }

  const connection = await db.socialConnection.findFirst({
    where: {
      id: connectionId,
      userId: session.userId,
    },
  });

  if (!connection) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const creatorInfo = await getTikTokCreatorInfo(connection.id);
  return NextResponse.json(creatorInfo);
}
