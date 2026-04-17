"use server";

import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import {
  addPromptReferences,
  createPrompt,
  deletePrompt,
  removePromptReference,
  updatePrompt,
} from "@/server/services/prompt";

async function requireUserId() {
  const session = await auth();

  if (!session?.userId) {
    redirect("/login?redirect=/prompts");
  }

  return session.userId;
}

function parseTags(raw: FormDataEntryValue | null) {
  return String(raw ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function parseReferenceIds(formData: FormData, fieldName = "selectedReferenceIds") {
  return formData.getAll(fieldName).filter((value): value is string => typeof value === "string");
}

export async function createPromptAction(formData: FormData) {
  const userId = await requireUserId();
  const title = String(formData.get("title") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();
  const isFavorite = String(formData.get("isFavorite") ?? "") === "true";
  const tags = parseTags(formData.get("tags"));
  const references = parseReferenceIds(formData).map((mediaObjectId) => ({ mediaObjectId }));

  const prompt = await createPrompt({
    isFavorite,
    references,
    tags,
    text,
    title,
    userId,
  });

  redirect(`/prompts/${prompt.id}`);
}

export async function updatePromptAction(formData: FormData) {
  const userId = await requireUserId();
  const promptId = String(formData.get("promptId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();
  const isFavorite = String(formData.get("isFavorite") ?? "") === "true";
  const tags = parseTags(formData.get("tags"));

  await updatePrompt({
    id: promptId,
    isFavorite,
    tags,
    text,
    title,
    userId,
  });

  redirect(`/prompts/${promptId}`);
}

export async function addPromptReferencesAction(formData: FormData) {
  const userId = await requireUserId();
  const promptId = String(formData.get("promptId") ?? "");
  const references = parseReferenceIds(formData).map((mediaObjectId) => ({ mediaObjectId }));

  await addPromptReferences({
    id: promptId,
    references,
    userId,
  });

  redirect(`/prompts/${promptId}`);
}

export async function removePromptReferenceAction(formData: FormData) {
  const userId = await requireUserId();
  const promptId = String(formData.get("promptId") ?? "");
  const mediaObjectId = String(formData.get("mediaObjectId") ?? "");

  await removePromptReference({
    mediaObjectId,
    promptId,
    userId,
  });

  redirect(`/prompts/${promptId}`);
}

export async function deletePromptAction(formData: FormData) {
  const userId = await requireUserId();
  const promptId = String(formData.get("promptId") ?? "");

  await deletePrompt({ id: promptId, userId });
  redirect("/prompts");
}
