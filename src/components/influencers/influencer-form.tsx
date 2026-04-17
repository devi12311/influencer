import { createInfluencerAction } from "@/actions/influencer";
import { ImageDropzone } from "@/components/upload/image-dropzone";
import { MediaImage } from "@/components/gallery/media-image";

export async function InfluencerCreateForm({
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
      <ImageDropzone kind="INFLUENCER_ASSET" />

      <form action={createInfluencerAction} className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-8">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-500">Create influencer</p>
          <h2 className="text-3xl font-semibold text-slate-950">Configure the influencer profile</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-slate-700">
            Name
            <input className="w-full rounded-xl border border-slate-300 px-4 py-3" name="name" required />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            Style notes
            <input className="w-full rounded-xl border border-slate-300 px-4 py-3" name="styleNotes" />
          </label>
        </div>

        <label className="block space-y-2 text-sm font-medium text-slate-700">
          Description
          <textarea className="min-h-32 w-full rounded-xl border border-slate-300 px-4 py-3" name="description" />
        </label>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Uploaded photos</h3>
            <p className="text-sm text-slate-600">Select the images for this influencer and mark between 1 and 5 as canonical.</p>
          </div>

          {uploadedMedia.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
              Upload at least one image before creating the influencer.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {uploadedMedia.map((media) => (
                <label key={media.id} className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-slate-200">
                    <MediaImage alt={`Uploaded media ${media.id}`} media={media} size="medium" />
                  </div>
                  <div className="space-y-2 text-sm text-slate-700">
                    <label className="flex items-center gap-2">
                      <input name="selectedMediaIds" type="checkbox" value={media.id} />
                      Use in this influencer
                    </label>
                    <label className="flex items-center gap-2">
                      <input name="canonicalMediaIds" type="checkbox" value={media.id} />
                      Mark as canonical
                    </label>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white" type="submit">
          Create influencer
        </button>
      </form>
    </div>
  );
}
