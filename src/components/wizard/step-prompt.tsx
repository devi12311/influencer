import Link from "next/link";
import { selectDraftPromptAction } from "@/actions/post";
import { MediaImage } from "@/components/gallery/media-image";

export function StepPrompt({
  draftId,
  prompts,
}: {
  draftId: string;
  prompts: Array<{
    id: string;
    isFavorite: boolean;
    references: Array<{ id: string; mediaObject: { height: number | null; objectKey: string; variants: Array<{ label: string; objectKey: string }>; width: number | null } }>;
    tags: string[];
    text: string;
    title: string;
  }>;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">Step 2</p>
          <h2 className="text-3xl font-semibold text-slate-950">Select prompt</h2>
        </div>
        <Link className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700" href="/prompts/new">
          Create new prompt
        </Link>
      </div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {prompts.map((prompt) => (
          <form key={prompt.id} action={selectDraftPromptAction} className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-5">
            <input name="draftId" type="hidden" value={draftId} />
            <input name="promptId" type="hidden" value={prompt.id} />
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-xl font-semibold text-slate-950">{prompt.title}</h3>
              {prompt.isFavorite ? <span className="text-lg text-amber-500">★</span> : null}
            </div>
            <p className="line-clamp-4 text-sm leading-7 text-slate-600">{prompt.text}</p>
            <div className="grid grid-cols-4 gap-2">
              {prompt.references.slice(0, 4).map((reference) => (
                <div key={reference.id} className="aspect-square overflow-hidden rounded-2xl bg-slate-100">
                  <MediaImage alt={prompt.title} media={reference.mediaObject} size="thumb" />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {prompt.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                  {tag}
                </span>
              ))}
            </div>
            <button className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white" type="submit">
              Use prompt
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
