export const dynamic = "force-dynamic";

import { auth } from "@/server/auth";
import { PromptCreateForm } from "@/components/prompts/prompt-form";
import { listUnassignedPromptMedia } from "@/server/services/prompt";

export default async function NewPromptPage() {
  const session = await auth();
  const uploadedMedia = session?.userId ? await listUnassignedPromptMedia(session.userId) : [];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-500">Phase 9</p>
        <h1 className="text-3xl font-semibold text-slate-950">Create prompt</h1>
        <p className="max-w-2xl text-sm leading-7 text-slate-600">
          Save reusable creative directions, optional reference images, and tags so future generations can be assembled quickly.
        </p>
      </div>
      <PromptCreateForm uploadedMedia={uploadedMedia} />
    </div>
  );
}
