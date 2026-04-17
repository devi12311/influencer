export const dynamic = "force-dynamic";

import Link from "next/link";
import { MediaImage } from "@/components/gallery/media-image";
import { auth } from "@/server/auth";
import { listInfluencersByUser } from "@/server/services/influencer";

export default async function InfluencersPage() {
  const session = await auth();
  const influencers = session?.userId ? await listInfluencersByUser(session.userId) : [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">Library</p>
          <h1 className="text-3xl font-semibold text-slate-950">AI Influencers</h1>
        </div>
        <Link className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white" href="/influencers/new">
          New influencer
        </Link>
      </div>

      {influencers.length === 0 ? (
        <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">
          You have not created any influencers yet. Upload reference photos and create your first one.
        </section>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {influencers.map((influencer) => {
            const canonical = influencer.assets.find((asset) => asset.isCanonical) ?? influencer.assets[0];
            return (
              <Link key={influencer.id} className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg" href={`/influencers/${influencer.id}`}>
                <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-slate-100">
                  {canonical ? (
                    <MediaImage alt={influencer.name} media={canonical.mediaObject} size="medium" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">No images</div>
                  )}
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold text-slate-950">{influencer.name}</h2>
                  <p className="text-sm text-slate-600">{influencer.assets.length} photos · {influencer.assets.filter((asset) => asset.isCanonical).length} canonical</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
