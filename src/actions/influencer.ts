"use server";

import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import {
  createInfluencer,
  deleteInfluencer,
  removeInfluencerAsset,
  setInfluencerAssetCanonical,
  updateInfluencer,
} from "@/server/services/influencer";

async function requireUserId() {
  const session = await auth();

  if (!session?.userId) {
    redirect("/login?redirect=/influencers");
  }

  return session.userId;
}

function parseSelectedAssets(formData: FormData) {
  const selectedMediaIds = formData.getAll("selectedMediaIds").filter((value): value is string => typeof value === "string");
  const canonicalMediaIds = new Set(
    formData.getAll("canonicalMediaIds").filter((value): value is string => typeof value === "string"),
  );

  return selectedMediaIds.map((mediaObjectId) => ({
    isCanonical: canonicalMediaIds.has(mediaObjectId),
    mediaObjectId,
  }));
}

export async function createInfluencerAction(formData: FormData) {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const styleNotes = String(formData.get("styleNotes") ?? "").trim() || null;
  const assets = parseSelectedAssets(formData);

  const influencer = await createInfluencer({
    assets,
    description,
    name,
    styleNotes,
    userId,
  });

  redirect(`/influencers/${influencer.id}`);
}

export async function updateInfluencerAction(formData: FormData) {
  const userId = await requireUserId();
  const influencerId = String(formData.get("influencerId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const styleNotes = String(formData.get("styleNotes") ?? "").trim() || null;

  await updateInfluencer({
    description,
    id: influencerId,
    name,
    styleNotes,
    userId,
  });

  redirect(`/influencers/${influencerId}?tab=overview`);
}

export async function setCanonicalAction(formData: FormData) {
  const userId = await requireUserId();
  const influencerId = String(formData.get("influencerId") ?? "");
  const mediaObjectId = String(formData.get("mediaObjectId") ?? "");
  const isCanonical = String(formData.get("isCanonical") ?? "") === "true";

  await setInfluencerAssetCanonical({
    influencerId,
    isCanonical,
    mediaObjectId,
    userId,
  });

  redirect(`/influencers/${influencerId}?tab=${isCanonical ? "canonical" : "library"}`);
}

export async function removeInfluencerAssetAction(formData: FormData) {
  const userId = await requireUserId();
  const influencerId = String(formData.get("influencerId") ?? "");
  const mediaObjectId = String(formData.get("mediaObjectId") ?? "");

  await removeInfluencerAsset({
    influencerId,
    mediaObjectId,
    userId,
  });

  redirect(`/influencers/${influencerId}?tab=library`);
}

export async function deleteInfluencerAction(formData: FormData) {
  const userId = await requireUserId();
  const influencerId = String(formData.get("influencerId") ?? "");

  await deleteInfluencer({ id: influencerId, userId });
  redirect("/influencers");
}
