import { createPromptAction } from "@/actions/prompt";
import { MediaImage } from "@/components/gallery/media-image";
import { PromptTagInput } from "@/components/prompts/tag-input";
import { ImageDropzone } from "@/components/upload/image-dropzone";

export async function PromptCreateForm({
  uploadedMedia,
}: {
  uploadedMedia: Array<{
    height: number | null;
    id: string;
    objectKey: string;
    variants: Array<{ label: string; objectKey: string }>;
    width: number | null;
  }>;
}) {
  return (
    <div className="space-y-8">
      <ImageDropzone kind="PROMPT_REFERENCE" />

      <form action={createPromptAction} className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-8">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-500">Create prompt</p>
          <h2 className="text-3xl font-semibold text-slate-950">Build a reusable prompt template</h2>
        </div>

        <label className="block space-y-2 text-sm font-medium text-slate-700">
          Title
          <input className="w-full rounded-xl border border-slate-300 px-4 py-3" name="title" required />
        </label>

        <label className="block space-y-2 text-sm font-medium text-slate-700">
          Prompt text
          <textarea className="min-h-40 w-full rounded-xl border border-slate-300 px-4 py-3" name="text" required />
        </label>

        <PromptTagInput />

        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input name="isFavorite" type="checkbox" value="true" />
          Mark as favorite
        </label>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Reference images</h3>
            <p className="text-sm text-slate-600">Select up to 4 uploaded prompt references.</p>
          </div>

          {uploadedMedia.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
              Upload prompt reference images first if you want this prompt to include visual guidance.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {uploadedMedia.map((media) => (
                <label key={media.id} className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="aspect-square overflow-hidden rounded-2xl bg-slate-100">
                    <MediaImage alt={`Prompt reference ${media.id}`} media={media} size="medium" />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input name="selectedReferenceIds" type="checkbox" value={media.id} />
                    Use as reference
                  </label>
                </label>
              ))}
            </div>
          )}
        </div>

        <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white" type="submit">
          Create prompt
        </button>
      </form>
    </div>
  );
}
