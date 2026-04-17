export const dynamic = "force-dynamic";

import Link from "next/link";
import { MediaImage } from "@/components/gallery/media-image";
import { auth } from "@/server/auth";
import { listPostsByUser } from "@/server/services/post";

export default async function PostsPage() {
  const session = await auth();
  const posts = session?.userId ? await listPostsByUser(session.userId) : [];

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
      {posts.length === 0 ? (
        <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">
          You have not saved any posts yet.
        </section>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {posts.map((post) => (
            <Link key={post.id} className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-5" href={`/posts/${post.id}`}>
              <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-slate-100">
                {post.media[0] ? <MediaImage alt={post.title ?? "Saved post"} media={post.media[0].mediaObject} size="medium" /> : null}
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-slate-950">{post.title ?? "Untitled post"}</h2>
                <p className="text-sm text-slate-600">{post.influencer?.name ?? "No influencer"}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
