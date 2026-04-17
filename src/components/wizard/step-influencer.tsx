import Link from "next/link";
import { selectDraftInfluencerAction } from "@/actions/post";
import { MediaImage } from "@/components/gallery/media-image";

export function StepInfluencer({
  draftId,
  influencers,
}: {
  draftId: string;
  influencers: Array<{
    assets: Array<{ isCanonical: boolean; mediaObject: { height: number | null; objectKey: string; variants: Array<{ label: string; objectKey: string }>; width: number | null } }>;
    id: string;
    name: string;
  }>;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">Step 1</p>
          <h2 className="text-3xl font-semibold text-slate-950">Select influencer</h2>
        </div>
        <Link className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700" href="/influencers/new">
          Create new influencer
        </Link>
      </div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {influencers.map((influencer) => {
          const canonical = influencer.assets.find((asset) => asset.isCanonical) ?? influencer.assets[0];
          return (
            <form key={influencer.id} action={selectDraftInfluencerAction} className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-5">
              <input name="draftId" type="hidden" value={draftId} />
              <input name="influencerId" type="hidden" value={influencer.id} />
              <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-slate-100">
                {canonical ? <MediaImage alt={influencer.name} media={canonical.mediaObject} size="medium" /> : null}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-950">{influencer.name}</h3>
                <p className="text-sm text-slate-600">{influencer.assets.length} photos</p>
              </div>
              <button className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white" type="submit">
                Use influencer
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}
