export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { addPromptReferencesAction, deletePromptAction, removePromptReferenceAction, updatePromptAction } from "@/actions/prompt";
import { MediaImage } from "@/components/gallery/media-image";
import { PromptTagInput } from "@/components/prompts/tag-input";
import { ImageDropzone } from "@/components/upload/image-dropzone";
import { auth } from "@/server/auth";
import { getPromptById, listUnassignedPromptMedia } from "@/server/services/prompt";

export default async function PromptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const prompt = session?.userId ? await getPromptById({ id, userId: session.userId }) : null;
  const uploadedMedia = session?.userId ? await listUnassignedPromptMedia(session.userId) : [];

  if (!prompt) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">Prompt</p>
          <h1 className="text-3xl font-semibold text-slate-950">{prompt.title}</h1>
        </div>
        <form action={deletePromptAction}>
          <input name="promptId" type="hidden" value={prompt.id} />
          <button className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700" type="submit">
            Delete prompt
          </button>
        </form>
      </div>

      <form action={updatePromptAction} className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-8">
        <input name="promptId" type="hidden" value={prompt.id} />
        <label className="block space-y-2 text-sm font-medium text-slate-700">
          Title
          <input className="w-full rounded-xl border border-slate-300 px-4 py-3" defaultValue={prompt.title} name="title" required />
        </label>
        <label className="block space-y-2 text-sm font-medium text-slate-700">
          Prompt text
          <textarea className="min-h-40 w-full rounded-xl border border-slate-300 px-4 py-3" defaultValue={prompt.text} name="text" required />
        </label>
        <PromptTagInput defaultTags={prompt.tags} />
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input defaultChecked={prompt.isFavorite} name="isFavorite" type="checkbox" value="true" />
          Mark as favorite
        </label>
        <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white" type="submit">
          Save prompt
        </button>
      </form>

      <section className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-slate-950">Reference library</h2>
          <p className="text-sm text-slate-600">Prompts may include up to 4 reference images.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {prompt.references.map((reference) => (
            <article key={reference.id} className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="aspect-square overflow-hidden rounded-2xl bg-slate-100">
                <MediaImage alt={prompt.title} media={reference.mediaObject} size="medium" />
              </div>
              <form action={removePromptReferenceAction}>
                <input name="promptId" type="hidden" value={prompt.id} />
                <input name="mediaObjectId" type="hidden" value={reference.mediaObjectId} />
                <button className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-700" type="submit">
                  Remove reference
                </button>
              </form>
            </article>
          ))}
        </div>

        <ImageDropzone kind="PROMPT_REFERENCE" />

        <form action={addPromptReferencesAction} className="space-y-4">
          <input name="promptId" type="hidden" value={prompt.id} />
          {uploadedMedia.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
              Upload or keep spare prompt references here to attach them later.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {uploadedMedia.map((media) => (
                <label key={media.id} className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="aspect-square overflow-hidden rounded-2xl bg-slate-100">
                    <MediaImage alt={`Prompt media ${media.id}`} media={media} size="medium" />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input name="selectedReferenceIds" type="checkbox" value={media.id} />
                    Attach to prompt
                  </label>
                </label>
              ))}
            </div>
          )}
          <button className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700" type="submit">
            Add selected references
          </button>
        </form>
      </section>
    </div>
  );
}
