"use client";

import { useState } from "react";

interface PreviewConnection {
  displayName: string | null;
  externalAccountId: string;
  id: string;
  platform: string;
}

interface Override {
  caption: string;
  selected: boolean;
}

interface PublicationPreviewsProps {
  connections: PreviewConnection[];
  fallbackCaption: string;
  imageUrl: string | null;
  overrides: Record<string, Override>;
}

const PLATFORM_LABELS: Record<string, string> = {
  FACEBOOK_PAGE: "Facebook",
  INSTAGRAM: "Instagram",
  THREADS: "Threads",
  TIKTOK: "TikTok",
};

export function PublicationPreviews({ connections, fallbackCaption, imageUrl, overrides }: PublicationPreviewsProps) {
  const [activeId, setActiveId] = useState(connections[0]?.id ?? "");
  const active = connections.find((connection) => connection.id === activeId) ?? connections[0];

  if (!active) {
    return (
      <aside className="rounded-[2rem] border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Connect a social account to preview how this post will look.
      </aside>
    );
  }

  const override = overrides[active.id];
  const caption = override?.caption?.trim() || fallbackCaption || "";
  const handle = active.displayName ?? active.externalAccountId;

  return (
    <aside className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-4 lg:sticky lg:top-4">
      <div className="px-2">
        <p className="text-sm font-medium text-slate-500">Preview</p>
        <h2 className="text-lg font-semibold text-slate-950">How it will look</h2>
      </div>

      <div className="flex flex-wrap gap-1 rounded-full border border-slate-200 bg-slate-50 p-1">
        {connections.map((connection) => {
          const isActive = connection.id === active.id;
          return (
            <button
              key={connection.id}
              type="button"
              onClick={() => setActiveId(connection.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                isActive ? "bg-slate-950 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {PLATFORM_LABELS[connection.platform] ?? connection.platform}
            </button>
          );
        })}
      </div>

      <PlatformPreview caption={caption} handle={handle} imageUrl={imageUrl} platform={active.platform} />
    </aside>
  );
}

function PlatformPreview({ caption, handle, imageUrl, platform }: { caption: string; handle: string; imageUrl: string | null; platform: string }) {
  switch (platform) {
    case "INSTAGRAM":
      return <InstagramPreview caption={caption} handle={handle} imageUrl={imageUrl} />;
    case "TIKTOK":
      return <TikTokPreview caption={caption} handle={handle} imageUrl={imageUrl} />;
    case "THREADS":
      return <ThreadsPreview caption={caption} handle={handle} imageUrl={imageUrl} />;
    case "FACEBOOK_PAGE":
      return <FacebookPreview caption={caption} handle={handle} imageUrl={imageUrl} />;
    default:
      return <GenericPreview caption={caption} handle={handle} imageUrl={imageUrl} platform={platform} />;
  }
}

function Avatar({ handle }: { handle: string }) {
  const initial = handle.charAt(0).toUpperCase() || "?";
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-indigo-500 text-xs font-semibold text-white">
      {initial}
    </div>
  );
}

function Placeholder() {
  return (
    <div className="flex aspect-[4/5] w-full items-center justify-center bg-slate-100 text-xs text-slate-400">
      No image yet
    </div>
  );
}

function InstagramPreview({ caption, handle, imageUrl }: { caption: string; handle: string; imageUrl: string | null }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <header className="flex items-center gap-2 px-3 py-2">
        <Avatar handle={handle} />
        <span className="text-sm font-semibold text-slate-900">{handle}</span>
      </header>
      {imageUrl ? <img alt="" className="aspect-square w-full object-cover" src={imageUrl} /> : <Placeholder />}
      <div className="space-y-2 px-3 py-3">
        <div className="flex gap-3 text-slate-700">
          <span>♡</span>
          <span>💬</span>
          <span>↗</span>
        </div>
        <p className="text-sm text-slate-900">
          <span className="font-semibold">{handle}</span> <span className="whitespace-pre-wrap">{caption}</span>
        </p>
      </div>
    </article>
  );
}

function TikTokPreview({ caption, handle, imageUrl }: { caption: string; handle: string; imageUrl: string | null }) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-slate-900 bg-black">
      {imageUrl ? <img alt="" className="aspect-[9/16] w-full object-cover opacity-95" src={imageUrl} /> : <div className="aspect-[9/16] w-full bg-slate-800" />}
      <div className="absolute inset-x-0 bottom-0 space-y-1 bg-gradient-to-t from-black/80 to-transparent p-3 text-white">
        <p className="text-sm font-semibold">@{handle}</p>
        <p className="text-xs whitespace-pre-wrap">{caption}</p>
      </div>
      <div className="absolute right-2 bottom-16 flex flex-col items-center gap-3 text-xs text-white">
        <span>♥</span>
        <span>💬</span>
        <span>↗</span>
      </div>
    </article>
  );
}

function ThreadsPreview({ caption, handle, imageUrl }: { caption: string; handle: string; imageUrl: string | null }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="flex gap-3">
        <Avatar handle={handle} />
        <div className="flex-1 space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-slate-900">{handle}</span>
            <span className="text-xs text-slate-500">now</span>
          </div>
          <p className="whitespace-pre-wrap text-sm text-slate-900">{caption}</p>
          {imageUrl ? (
            <img alt="" className="aspect-[4/5] w-full rounded-xl border border-slate-200 object-cover" src={imageUrl} />
          ) : null}
          <div className="flex gap-4 pt-1 text-slate-500">
            <span>♡</span>
            <span>💬</span>
            <span>↺</span>
            <span>↗</span>
          </div>
        </div>
      </div>
    </article>
  );
}

function FacebookPreview({ caption, handle, imageUrl }: { caption: string; handle: string; imageUrl: string | null }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <header className="flex items-center gap-2 px-3 py-2">
        <Avatar handle={handle} />
        <div>
          <p className="text-sm font-semibold text-slate-900">{handle}</p>
          <p className="text-xs text-slate-500">Just now · 🌐</p>
        </div>
      </header>
      {caption ? <p className="whitespace-pre-wrap px-3 pb-3 text-sm text-slate-900">{caption}</p> : null}
      {imageUrl ? <img alt="" className="aspect-[4/5] w-full object-cover" src={imageUrl} /> : <Placeholder />}
      <div className="flex gap-4 px-3 py-2 text-sm text-slate-600">
        <span>👍 Like</span>
        <span>💬 Comment</span>
        <span>↗ Share</span>
      </div>
    </article>
  );
}

function GenericPreview({ caption, handle, imageUrl, platform }: { caption: string; handle: string; imageUrl: string | null; platform: string }) {
  return (
    <article className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar handle={handle} />
          <span className="text-sm font-semibold text-slate-900">{handle}</span>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{platform}</span>
      </div>
      {imageUrl ? <img alt="" className="aspect-[4/5] w-full rounded-xl object-cover" src={imageUrl} /> : <Placeholder />}
      <p className="whitespace-pre-wrap text-sm text-slate-900">{caption}</p>
    </article>
  );
}
