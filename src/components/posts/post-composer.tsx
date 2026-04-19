"use client";

import { useState } from "react";
import { PublicationPreviews } from "./publication-previews";
import { PublishPanel, type PublicationOverride } from "./publish-panel";

interface Connection {
  displayName: string | null;
  externalAccountId: string;
  id: string;
  platform: string;
  status: string;
}

interface Publication {
  caption: string | null;
  errorMessage: string | null;
  externalId: string | null;
  id: string;
  options: unknown;
  platform: string;
  publishedAt: Date | null;
  scheduledAt: Date | null;
  socialConnection: Connection;
  status: string;
}

interface PostComposerProps {
  connections: Connection[];
  imageUrl: string | null;
  postCaption: string;
  postId: string;
  publications: Publication[];
}

function buildInitialOverrides(connections: Connection[], publications: Publication[]): Record<string, PublicationOverride> {
  const state: Record<string, PublicationOverride> = {};
  for (const connection of connections) {
    const publication = publications.find((item) => item.socialConnection.id === connection.id);
    const options = (publication?.options ?? {}) as Record<string, unknown>;
    state[connection.id] = {
      autoMusic: Boolean(options.auto_add_music),
      caption: publication?.caption ?? "",
      disableComment: Boolean(options.disable_comment),
      privacy: String(options.privacy_level ?? ""),
      reply: String(options.reply_control ?? ""),
      scheduledAt: publication?.scheduledAt ? new Date(publication.scheduledAt).toISOString().slice(0, 16) : "",
      selected: Boolean(publication),
    };
  }
  return state;
}

export function PostComposer({ connections, imageUrl, postCaption, postId, publications }: PostComposerProps) {
  const [overrides, setOverrides] = useState(() => buildInitialOverrides(connections, publications));

  const updateOverride = (connectionId: string, patch: Partial<PublicationOverride>) => {
    setOverrides((previous) => ({
      ...previous,
      [connectionId]: { ...previous[connectionId], ...patch },
    }));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
      <PublishPanel
        connections={connections}
        onChange={updateOverride}
        overrides={overrides}
        postId={postId}
        publications={publications}
      />
      <PublicationPreviews
        connections={connections}
        fallbackCaption={postCaption}
        imageUrl={imageUrl}
        overrides={overrides}
      />
    </div>
  );
}
