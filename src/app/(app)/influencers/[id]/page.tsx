export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteInfluencerAction, removeInfluencerAssetAction, setCanonicalAction, updateInfluencerAction } from "@/actions/influencer";
import { InfluencerGallery } from "@/components/influencers/influencer-gallery";
import { auth } from "@/server/auth";
import { getPresignedUrl } from "@/server/services/media";
import { getInfluencerById } from "@/server/services/influencer";

function buildGalleryPhotos(assets: Awaited<ReturnType<typeof getInfluencerById>>["assets"]) {
  return Promise.all(
    assets.map(async (asset) => ({
      alt: asset.isCanonical ? "Canonical influencer asset" : "Influencer library asset",
      height: asset.mediaObject.height ?? 800,
      src: await getPresignedUrl(asset.mediaObject, "medium"),
      title: asset.isCanonical ? "Canonical" : "Library",
      width: asset.mediaObject.width ?? 600,
    })),
  );
}

export default async function InfluencerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const tab = query.tab ?? "overview";
  const session = await auth();
  const influencer = session?.userId ? await getInfluencerById({ id, userId: session.userId }) : null;

  if (!influencer) {
    notFound();
  }

  const canonicalAssets = influencer.assets.filter((asset) => asset.isCanonical);
  const libraryPhotos = await buildGalleryPhotos(influencer.assets);
  const canonicalPhotos = await buildGalleryPhotos(canonicalAssets);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">Influencer</p>
          <h1 className="text-3xl font-semibold text-slate-950">{influencer.name}</h1>
        </div>
        <form action={deleteInfluencerAction}>
          <input name="influencerId" type="hidden" value={influencer.id} />
          <button className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700" type="submit">
            Delete influencer
          </button>
        </form>
      </div>

      <nav className="flex flex-wrap gap-2">
        {[
          ["overview", "Overview"],
          ["library", "Library"],
          ["canonical", "Canonical"],
        ].map(([value, label]) => (
          <Link
            key={value}
            className={`rounded-full px-4 py-2 text-sm font-medium ${tab === value ? "bg-slate-950 text-white" : "border border-slate-300 bg-white text-slate-700"}`}
            href={`/influencers/${influencer.id}?tab=${value}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {tab === "overview" ? (
        <form action={updateInfluencerAction} className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-8">
          <input name="influencerId" type="hidden" value={influencer.id} />
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Name
              <input className="w-full rounded-xl border border-slate-300 px-4 py-3" defaultValue={influencer.name} name="name" required />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Style notes
              <input className="w-full rounded-xl border border-slate-300 px-4 py-3" defaultValue={influencer.styleNotes ?? ""} name="styleNotes" />
            </label>
          </div>
          <label className="block space-y-2 text-sm font-medium text-slate-700">
            Description
            <textarea className="min-h-32 w-full rounded-xl border border-slate-300 px-4 py-3" defaultValue={influencer.description ?? ""} name="description" />
          </label>
          <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white" type="submit">
            Save changes
          </button>
        </form>
      ) : null}

      {tab === "library" ? (
        <div className="space-y-6">
          <InfluencerGallery photos={libraryPhotos} />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {influencer.assets.map((asset) => (
              <article key={asset.mediaObjectId} className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4">
                <div className="space-y-2 text-sm text-slate-600">
                  <p>{asset.mediaObject.width}×{asset.mediaObject.height}</p>
                  <p>{asset.isCanonical ? "Canonical photo" : "Library photo"}</p>
                </div>
                <div className="flex gap-2">
                  {!asset.isCanonical ? (
                    <form action={setCanonicalAction}>
                      <input name="influencerId" type="hidden" value={influencer.id} />
                      <input name="mediaObjectId" type="hidden" value={asset.mediaObjectId} />
                      <input name="isCanonical" type="hidden" value="true" />
                      <button className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700" type="submit">
                        Set as canonical
                      </button>
                    </form>
                  ) : null}
                  <form action={removeInfluencerAssetAction}>
                    <input name="influencerId" type="hidden" value={influencer.id} />
                    <input name="mediaObjectId" type="hidden" value={asset.mediaObjectId} />
                    <button className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-700" type="submit">
                      Remove
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "canonical" ? (
        <div className="space-y-6">
          <InfluencerGallery photos={canonicalPhotos} />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {canonicalAssets.map((asset) => (
              <article key={asset.mediaObjectId} className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4">
                <div className="space-y-2 text-sm text-slate-600">
                  <p>{asset.mediaObject.width}×{asset.mediaObject.height}</p>
                  <p>Canonical reference photo</p>
                </div>
                <div className="flex gap-2">
                  <form action={setCanonicalAction}>
                    <input name="influencerId" type="hidden" value={influencer.id} />
                    <input name="mediaObjectId" type="hidden" value={asset.mediaObjectId} />
                    <input name="isCanonical" type="hidden" value="false" />
                    <button className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700" type="submit">
                      Remove canonical
                    </button>
                  </form>
                  <form action={removeInfluencerAssetAction}>
                    <input name="influencerId" type="hidden" value={influencer.id} />
                    <input name="mediaObjectId" type="hidden" value={asset.mediaObjectId} />
                    <button className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-700" type="submit">
                      Remove
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
