export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { PostComposer } from "@/components/posts/post-composer";
import { PostStatusBadges } from "@/components/posts/post-status-badges";
import { auth } from "@/server/auth";
import { getPresignedUrl } from "@/server/services/media";
import { getPostById, listPublishableConnections } from "@/server/services/post";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const [post, connections] = session?.userId
    ? await Promise.all([
        getPostById({ id, userId: session.userId }),
        listPublishableConnections(session.userId),
      ])
    : [null, []];

  if (!post) {
    notFound();
  }

  const previewMedia = post.media[0]?.mediaObject ?? null;
  const previewImageUrl = previewMedia ? await getPresignedUrl(previewMedia, "medium") : null;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-500">Saved post</p>
        <h1 className="text-3xl font-semibold text-slate-950">{post.title ?? "Untitled post"}</h1>
        <p className="text-sm text-slate-600">{post.influencer?.name ?? "No influencer selected"}</p>
        <PostStatusBadges publications={post.publications.map((publication) => ({ id: publication.id, platform: publication.platform, status: publication.status }))} />
      </div>
      <PostComposer
        connections={connections}
        imageUrl={previewImageUrl}
        postCaption={post.caption ?? ""}
        postId={post.id}
        publications={post.publications.map((publication) => ({
          caption: publication.caption,
          errorMessage: publication.errorMessage,
          externalId: publication.externalId,
          id: publication.id,
          options: publication.options,
          platform: publication.platform,
          publishedAt: publication.publishedAt,
          scheduledAt: publication.scheduledAt,
          socialConnection: publication.socialConnection,
          status: publication.status,
        }))}
      />
    </div>
  );
}
