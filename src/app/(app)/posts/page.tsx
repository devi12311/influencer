export const dynamic = "force-dynamic";

import Link from "next/link";
import { PublicationStatus, SocialPlatform } from "@prisma/client";
import { MediaImage } from "@/components/gallery/media-image";
import { PostStatusBadges } from "@/components/posts/post-status-badges";
import { auth } from "@/server/auth";
import { listInfluencersByUser } from "@/server/services/influencer";
import { listPostsByUser } from "@/server/services/post";

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ dateFrom?: string; influencerId?: string; platform?: string; status?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const [posts, influencers] = session?.userId
    ? await Promise.all([
        listPostsByUser({
          dateFrom: params.dateFrom,
          influencerId: params.influencerId,
          platform: params.platform as SocialPlatform | undefined,
          status: params.status as PublicationStatus | undefined,
          userId: session.userId,
        }),
        listInfluencersByUser(session.userId),
      ])
    : [[], []];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">Posts</p>
          <h1 className="text-3xl font-semibold text-slate-950">Posts gallery</h1>
        </div>
        <Link className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white" href="/new-post">
          New post
        </Link>
      </div>

      <form className="grid gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 md:grid-cols-4">
        <select className="rounded-xl border border-slate-300 px-4 py-3" defaultValue={params.influencerId ?? ""} name="influencerId">
          <option value="">All influencers</option>
          {influencers.map((influencer) => (
            <option key={influencer.id} value={influencer.id}>
              {influencer.name}
            </option>
          ))}
        </select>
        <select className="rounded-xl border border-slate-300 px-4 py-3" defaultValue={params.platform ?? ""} name="platform">
          <option value="">All platforms</option>
          {Object.values(SocialPlatform).map((platform) => (
            <option key={platform} value={platform}>
              {platform}
            </option>
          ))}
        </select>
        <select className="rounded-xl border border-slate-300 px-4 py-3" defaultValue={params.status ?? ""} name="status">
          <option value="">All statuses</option>
          {Object.values(PublicationStatus).map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <input className="rounded-xl border border-slate-300 px-4 py-3" defaultValue={params.dateFrom ?? ""} name="dateFrom" type="date" />
        <button className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white md:col-span-4 md:w-fit" type="submit">
          Apply filters
        </button>
      </form>

      {posts.length === 0 ? (
        <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">
          You have not saved any posts that match the current filters.
        </section>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {posts.map((post) => (
            <Link key={post.id} className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-5" href={`/posts/${post.id}`}>
              <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-slate-100">
                {post.media[0] ? <MediaImage alt={post.title ?? "Saved post"} media={post.media[0].mediaObject} size="medium" /> : null}
              </div>
              <div className="space-y-2">
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold text-slate-950">{post.title ?? "Untitled post"}</h2>
                  <p className="text-sm text-slate-600">{post.influencer?.name ?? "No influencer"}</p>
                </div>
                <PostStatusBadges publications={post.publications.map((publication) => ({ id: publication.id, platform: publication.platform, status: publication.status }))} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
