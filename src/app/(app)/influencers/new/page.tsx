export const dynamic = "force-dynamic";

import { MediaKind } from "@prisma/client";
import { MediaImage } from "@/components/gallery/media-image";
import { ImageDropzone } from "@/components/upload/image-dropzone";
import { auth } from "@/server/auth";
import { listByUserAndKind } from "@/server/services/media";

export default async function NewInfluencerPage() {
  const session = await auth();
  const uploads = session?.userId ? await listByUserAndKind(session.userId, MediaKind.INFLUENCER_ASSET) : [];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-500">Phase 3 preview</p>
        <h2 className="text-3xl font-semibold text-slate-950">Upload influencer reference images</h2>
        <p className="max-w-2xl text-sm leading-7 text-slate-600">
          This blank workspace proves the media pipeline: upload original files to MinIO, commit metadata to PostgreSQL, and derive thumb/medium WebP variants with Sharp.
        </p>
      </div>

      <ImageDropzone kind="INFLUENCER_ASSET" />

      <section className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-950">Uploaded media</h3>
          <p className="text-sm text-slate-500">{uploads.length} items</p>
        </div>

        {uploads.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
            Upload a few images to see generated variants appear here.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {uploads.map((upload) => (
              <article key={upload.id} className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-slate-200">
                  <MediaImage alt={`Uploaded influencer asset ${upload.id}`} media={upload} size="medium" />
                </div>
                <div className="space-y-1 text-sm text-slate-600">
                  <p className="font-medium text-slate-900">{upload.width}×{upload.height}</p>
                  <p>Original key: {upload.objectKey}</p>
                  <p>Variants: {upload.variants.map((variant) => variant.label).join(", ") || "pending"}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
