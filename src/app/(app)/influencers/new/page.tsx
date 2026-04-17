export const dynamic = "force-dynamic";

import { auth } from "@/server/auth";
import { InfluencerCreateForm } from "@/components/influencers/influencer-form";
import { listUnassignedInfluencerMedia } from "@/server/services/influencer";

export default async function NewInfluencerPage() {
  const session = await auth();
  const uploadedMedia = session?.userId ? await listUnassignedInfluencerMedia(session.userId) : [];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-500">Phase 8</p>
        <h1 className="text-3xl font-semibold text-slate-950">Create AI influencer</h1>
        <p className="max-w-2xl text-sm leading-7 text-slate-600">
          Upload reference photos, select the library items for this influencer, and mark the canonical assets used to preserve identity during generation.
        </p>
      </div>
      <InfluencerCreateForm uploadedMedia={uploadedMedia} />
    </div>
  );
}
