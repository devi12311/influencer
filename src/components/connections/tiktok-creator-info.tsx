"use client";

import { useEffect, useState } from "react";

interface TikTokCreatorInfo {
  comment_disabled?: boolean;
  creator_avatar_url?: string;
  creator_nickname?: string;
  creator_username?: string;
  duet_disabled?: boolean;
  max_video_post_duration_sec?: number;
  privacy_level_options?: string[];
  stitch_disabled?: boolean;
}

export function TikTokCreatorInfoCard({ connectionId }: { connectionId: string }) {
  const [creatorInfo, setCreatorInfo] = useState<TikTokCreatorInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCreatorInfo() {
      try {
        const response = await fetch(`/api/tiktok/creator-info?connectionId=${encodeURIComponent(connectionId)}`);
        if (!response.ok) {
          throw new Error(`Unable to load TikTok creator info (${response.status}).`);
        }
        const data = (await response.json()) as TikTokCreatorInfo;
        if (!cancelled) {
          setCreatorInfo(data);
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "Unable to load TikTok creator info.");
        }
      }
    }

    void loadCreatorInfo();

    return () => {
      cancelled = true;
    };
  }, [connectionId]);

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!creatorInfo) {
    return <p className="text-sm text-slate-500">Loading TikTok creator settings…</p>;
  }

  return (
    <div className="space-y-3 rounded-2xl border border-orange-200 bg-orange-50 p-4">
      <p className="text-sm font-medium text-orange-800">
        TikTok app audit is still required — direct posts may be restricted to SELF_ONLY visibility.
      </p>
      <div className="space-y-1 text-sm text-slate-700">
        {creatorInfo.creator_username ? <p>Creator: @{creatorInfo.creator_username}</p> : null}
        {creatorInfo.creator_nickname ? <p>Display name: {creatorInfo.creator_nickname}</p> : null}
        {typeof creatorInfo.max_video_post_duration_sec === "number" ? (
          <p>Max video duration: {creatorInfo.max_video_post_duration_sec}s</p>
        ) : null}
      </div>
      <label className="block space-y-2 text-sm font-medium text-slate-700">
        Available privacy levels
        <select className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2" defaultValue={creatorInfo.privacy_level_options?.[0] ?? "SELF_ONLY"}>
          {(creatorInfo.privacy_level_options ?? ["SELF_ONLY"]).map((privacyLevel) => (
            <option key={privacyLevel} value={privacyLevel}>
              {privacyLevel}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
