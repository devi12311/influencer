import { savePostFromDraftAction } from "@/actions/post";
import { MediaImage } from "@/components/gallery/media-image";

export function StepReview({
  draftId,
  generation,
  influencerName,
  promptTitle,
}: {
  draftId: string;
  generation: {
    id: string;
    outputMedia: { height: number | null; objectKey: string; variants: Array<{ label: string; objectKey: string }>; width: number | null } | null;
  };
  influencerName: string;
  promptTitle: string;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-8">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-500">Step 4</p>
          <h2 className="text-3xl font-semibold text-slate-950">Review and save</h2>
          <p className="text-sm text-slate-600">Influencer: {influencerName} · Prompt: {promptTitle}</p>
        </div>
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
          {generation.outputMedia ? <MediaImage alt="Final generation" media={generation.outputMedia} size="medium" /> : null}
        </div>
      </section>
      <form action={savePostFromDraftAction} className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-6">
        <input name="draftId" type="hidden" value={draftId} />
        <input name="winnerGenerationId" type="hidden" value={generation.id} />
        <label className="space-y-2 text-sm font-medium text-slate-700">
          Title
          <input className="w-full rounded-xl border border-slate-300 px-4 py-3" name="title" />
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          Default caption
          <textarea className="min-h-36 w-full rounded-xl border border-slate-300 px-4 py-3" name="caption" />
        </label>
        <button className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white" type="submit">
          Save post
        </button>
      </form>
    </div>
  );
}
