import { MediaKind } from "@prisma/client";
import { db } from "@/server/db";
import { deleteMediaWithVariants } from "@/server/services/media";

interface InfluencerAssetSelection {
  isCanonical: boolean;
  mediaObjectId: string;
}

function ensureCanonicalRange(canonicalCount: number) {
  if (canonicalCount < 1 || canonicalCount > 5) {
    throw new Error("Influencers must have between 1 and 5 canonical photos.");
  }
}

async function assertMediaOwnership(userId: string, mediaObjectIds: string[]) {
  const media = await db.mediaObject.findMany({
    where: {
      id: { in: mediaObjectIds },
      kind: MediaKind.INFLUENCER_ASSET,
      userId,
    },
    include: {
      influencerAssets: true,
    },
  });

  if (media.length !== mediaObjectIds.length) {
    throw new Error("Some uploaded media items were not found for this user.");
  }

  return media;
}

export async function createInfluencer(input: {
  assets: InfluencerAssetSelection[];
  description?: string | null;
  name: string;
  styleNotes?: string | null;
  userId: string;
}) {
  const canonicalCount = input.assets.filter((asset) => asset.isCanonical).length;
  ensureCanonicalRange(canonicalCount);

  const ownedMedia = await assertMediaOwnership(
    input.userId,
    input.assets.map((asset) => asset.mediaObjectId),
  );

  if (ownedMedia.some((media) => media.influencerAssets.length > 0)) {
    throw new Error("Some uploaded media are already attached to an influencer.");
  }

  return db.influencer.create({
    data: {
      assets: {
        create: input.assets.map((asset, index) => ({
          isCanonical: asset.isCanonical,
          mediaObjectId: asset.mediaObjectId,
          sortOrder: index,
        })),
      },
      description: input.description,
      name: input.name,
      styleNotes: input.styleNotes,
      userId: input.userId,
    },
  });
}

export async function updateInfluencer(input: {
  description?: string | null;
  id: string;
  name: string;
  styleNotes?: string | null;
  userId: string;
}) {
  const influencer = await db.influencer.findFirstOrThrow({
    where: { id: input.id, userId: input.userId },
  });

  return db.influencer.update({
    where: { id: influencer.id },
    data: {
      description: input.description,
      name: input.name,
      styleNotes: input.styleNotes,
    },
  });
}

async function getInfluencerAssetCounts(influencerId: string) {
  const assets = await db.influencerAsset.findMany({
    where: { influencerId },
    select: { id: true, isCanonical: true, mediaObjectId: true },
  });

  return {
    assets,
    canonicalCount: assets.filter((asset) => asset.isCanonical).length,
  };
}

export async function setInfluencerAssetCanonical(input: {
  influencerId: string;
  isCanonical: boolean;
  mediaObjectId: string;
  userId: string;
}) {
  const influencer = await db.influencer.findFirstOrThrow({
    where: { id: input.influencerId, userId: input.userId },
  });

  const { assets, canonicalCount } = await getInfluencerAssetCounts(influencer.id);
  const target = assets.find((asset) => asset.mediaObjectId === input.mediaObjectId);

  if (!target) {
    throw new Error("Influencer asset not found.");
  }

  const nextCanonicalCount = canonicalCount + (input.isCanonical && !target.isCanonical ? 1 : 0) - (!input.isCanonical && target.isCanonical ? 1 : 0);
  ensureCanonicalRange(nextCanonicalCount);

  return db.influencerAsset.update({
    where: { id: target.id },
    data: { isCanonical: input.isCanonical },
  });
}

export async function removeInfluencerAsset(input: {
  influencerId: string;
  mediaObjectId: string;
  userId: string;
}) {
  const influencer = await db.influencer.findFirstOrThrow({
    where: { id: input.influencerId, userId: input.userId },
  });
  const { assets, canonicalCount } = await getInfluencerAssetCounts(influencer.id);
  const target = assets.find((asset) => asset.mediaObjectId === input.mediaObjectId);

  if (!target) {
    throw new Error("Influencer asset not found.");
  }

  const remainingAssets = assets.length - 1;
  const remainingCanonicalCount = canonicalCount - (target.isCanonical ? 1 : 0);

  if (remainingAssets > 0) {
    ensureCanonicalRange(remainingCanonicalCount);
  }

  await db.influencerAsset.delete({ where: { id: target.id } });
  await deleteMediaWithVariants(input.mediaObjectId, input.userId);
}

export async function deleteInfluencer(input: { id: string; userId: string }) {
  const influencer = await db.influencer.findFirstOrThrow({
    where: { id: input.id, userId: input.userId },
    include: {
      assets: true,
    },
  });

  for (const asset of influencer.assets) {
    await deleteMediaWithVariants(asset.mediaObjectId, input.userId);
  }

  await db.influencer.delete({ where: { id: influencer.id } });
}

export async function listInfluencersByUser(userId: string) {
  return db.influencer.findMany({
    where: { userId },
    include: {
      assets: {
        include: {
          mediaObject: {
            include: {
              variants: true,
            },
          },
        },
        orderBy: [{ isCanonical: "desc" }, { sortOrder: "asc" }],
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listUnassignedInfluencerMedia(userId: string) {
  return db.mediaObject.findMany({
    where: {
      influencerAssets: { none: {} },
      kind: MediaKind.INFLUENCER_ASSET,
      userId,
    },
    include: {
      variants: {
        orderBy: { label: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getInfluencerById(input: { id: string; userId: string }) {
  return db.influencer.findFirstOrThrow({
    where: {
      id: input.id,
      userId: input.userId,
    },
    include: {
      assets: {
        include: {
          mediaObject: {
            include: {
              variants: {
                orderBy: { label: "asc" },
              },
            },
          },
        },
        orderBy: [{ isCanonical: "desc" }, { sortOrder: "asc" }],
      },
    },
  });
}
