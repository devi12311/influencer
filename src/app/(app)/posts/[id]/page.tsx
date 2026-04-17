export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { MediaImage } from "@/components/gallery/media-image";
import { auth } from "@/server/auth";
import { getPostById } from "@/server/services/post";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const post = session?.userId ? await getPostById({ id, userId: session.userId }) : null;

  if (!post) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-slate-500">Saved post</p>
        <h1 className="text-3xl font-semibold text-slate-950">{post.title ?? "Untitled post"}</h1>
        <p className="text-sm text-slate-600">{post.influencer?.name ?? "No influencer selected"}</p>
      </div>
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6">
        {post.media[0] ? <MediaImage alt={post.title ?? "Saved post"} media={post.media[0].mediaObject} size="medium" /> : null}
      </section>
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-600">
        <h2 className="mb-3 text-lg font-semibold text-slate-950">Caption</h2>
        <p>{post.caption ?? "No caption yet."}</p>
      </section>
    </div>
  );
}
