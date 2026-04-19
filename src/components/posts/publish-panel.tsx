"use client";

import { useMemo, useState } from "react";
import { cancelScheduledPublicationAction, createPublicationsAction, retryPublicationAction } from "@/actions/post";

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

export interface PublicationOverride {
  autoMusic: boolean;
  caption: string;
  disableComment: boolean;
  privacy: string;
  reply: string;
  scheduledAt: string;
  selected: boolean;
}

interface PublishPanelProps {
  connections: Connection[];
  onChange: (connectionId: string, patch: Partial<PublicationOverride>) => void;
  overrides: Record<string, PublicationOverride>;
  postId: string;
  publications: Publication[];
}

const PLATFORM_META: Record<string, { color: string; label: string; limit: number; mark: string }> = {
  FACEBOOK_PAGE: { color: "bg-blue-600", label: "Facebook", limit: 63206, mark: "f" },
  INSTAGRAM: { color: "bg-gradient-to-br from-pink-500 via-rose-500 to-amber-400", label: "Instagram", limit: 2200, mark: "IG" },
  THREADS: { color: "bg-slate-900", label: "Threads", limit: 500, mark: "@" },
  TIKTOK: { color: "bg-slate-950", label: "TikTok", limit: 2200, mark: "TT" },
};

const DEFAULT_META = { color: "bg-slate-500", label: "", limit: 2200, mark: "•" };

function metaFor(platform: string) {
  return PLATFORM_META[platform] ?? { ...DEFAULT_META, label: platform };
}

function statusTone(status: string | undefined) {
  switch (status) {
    case "PUBLISHED":
      return "bg-emerald-100 text-emerald-700";
    case "FAILED":
      return "bg-red-100 text-red-700";
    case "SCHEDULED":
      return "bg-amber-100 text-amber-700";
    case "PUBLISHING":
      return "bg-sky-100 text-sky-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export function PublishPanel({ connections, onChange, overrides, postId, publications }: PublishPanelProps) {
  const firstSelected = connections.find((connection) => overrides[connection.id]?.selected);
  const [activeId, setActiveId] = useState<string>(firstSelected?.id ?? connections[0]?.id ?? "");
  const active = connections.find((connection) => connection.id === activeId) ?? connections[0];
  const activeState = active ? overrides[active.id] : undefined;
  const activePublication = active ? publications.find((item) => item.socialConnection.id === active.id) : undefined;
  const activeMeta = active ? metaFor(active.platform) : DEFAULT_META;

  const summary = useMemo(() => {
    let now = 0;
    let scheduled = 0;
    const nowMs = Date.now();
    for (const connection of connections) {
      const state = overrides[connection.id];
      if (!state?.selected) continue;
      const when = state.scheduledAt ? new Date(state.scheduledAt).getTime() : NaN;
      if (Number.isFinite(when) && when > nowMs) scheduled += 1;
      else now += 1;
    }
    return { now, scheduled, total: now + scheduled };
  }, [connections, overrides]);

  if (connections.length === 0) {
    return (
      <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        Connect a social account to publish this post.
      </div>
    );
  }

  const captionLength = activeState?.caption.length ?? 0;
  const limit = activeMeta.limit;
  const overLimit = captionLength > limit;

  return (
    <div className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6">
      <form action={createPublicationsAction} className="space-y-6">
        <input name="postId" type="hidden" value={postId} />

        <div className="flex flex-wrap gap-2">
          {connections.map((connection) => {
            const meta = metaFor(connection.platform);
            const state = overrides[connection.id];
            if (!state) return null;
            const publication = publications.find((item) => item.socialConnection.id === connection.id);
            const isActive = connection.id === active?.id;
            const isSelected = state.selected;
            return (
              <button
                key={connection.id}
                type="button"
                onClick={() => setActiveId(connection.id)}
                className={`group flex items-center gap-2 rounded-full border px-2 py-1 pr-3 text-sm transition ${
                  isActive ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-800 hover:border-slate-400"
                } ${isSelected ? "" : "opacity-60"}`}
              >
                <span
                  onClick={(event) => {
                    event.stopPropagation();
                    onChange(connection.id, { selected: !isSelected });
                  }}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${meta.color}`}
                  role="checkbox"
                  aria-checked={isSelected}
                >
                  {isSelected ? "✓" : meta.mark}
                </span>
                <span className="flex flex-col items-start leading-tight">
                  <span className="text-xs font-semibold">{meta.label || connection.platform}</span>
                  <span className={`text-[11px] ${isActive ? "text-slate-300" : "text-slate-500"}`}>
                    {connection.displayName ?? connection.externalAccountId}
                  </span>
                </span>
                {publication?.status ? (
                  <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusTone(publication.status)}`}>
                    {publication.status.toLowerCase()}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {active && activeState ? (
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <header className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${activeMeta.color}`}>
                  {activeMeta.mark}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-950">{activeMeta.label || active.platform}</p>
                  <p className="text-xs text-slate-500">{active.displayName ?? active.externalAccountId}</p>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <input
                  checked={activeState.selected}
                  onChange={(event) => onChange(active.id, { selected: event.target.checked })}
                  type="checkbox"
                />
                Include this account
              </label>
            </header>

            <label className="block space-y-1 text-sm font-medium text-slate-700">
              <div className="flex items-center justify-between">
                <span>Caption</span>
                <div className="flex items-center gap-2 text-xs font-normal">
                  <button
                    type="button"
                    className="text-slate-500 underline-offset-2 hover:underline disabled:opacity-40"
                    disabled={!activeState.caption}
                    onClick={() => onChange(active.id, { caption: "" })}
                  >
                    Use main caption
                  </button>
                  <span className={overLimit ? "font-semibold text-red-600" : "text-slate-500"}>
                    {captionLength}/{limit}
                  </span>
                </div>
              </div>
              <textarea
                className={`min-h-28 w-full rounded-xl border bg-white px-4 py-3 text-sm ${
                  overLimit ? "border-red-400 focus:outline-red-500" : "border-slate-300"
                }`}
                placeholder="Leave empty to reuse the post's main caption"
                value={activeState.caption}
                onChange={(event) => onChange(active.id, { caption: event.target.value })}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-1 text-sm font-medium text-slate-700">
                Schedule
                <input
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm"
                  onChange={(event) => onChange(active.id, { scheduledAt: event.target.value })}
                  type="datetime-local"
                  value={activeState.scheduledAt}
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-700">
                Privacy level
                <input
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm"
                  onChange={(event) => onChange(active.id, { privacy: event.target.value })}
                  placeholder="public"
                  value={activeState.privacy}
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-700">
                Reply control
                <input
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm"
                  onChange={(event) => onChange(active.id, { reply: event.target.value })}
                  placeholder="everyone"
                  value={activeState.reply}
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-5 text-sm text-slate-700">
              <label className="flex items-center gap-2">
                <input
                  checked={activeState.disableComment}
                  onChange={(event) => onChange(active.id, { disableComment: event.target.checked })}
                  type="checkbox"
                />
                Disable comments
              </label>
              {active.platform === "TIKTOK" ? (
                <label className="flex items-center gap-2">
                  <input
                    checked={activeState.autoMusic}
                    onChange={(event) => onChange(active.id, { autoMusic: event.target.checked })}
                    type="checkbox"
                  />
                  Auto add music
                </label>
              ) : null}
            </div>

            {activePublication?.errorMessage ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{activePublication.errorMessage}</p>
            ) : null}
            {activePublication?.externalId ? (
              <p className="text-xs text-slate-500">External ID: {activePublication.externalId}</p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {activePublication?.status === "FAILED" ? (
                <button
                  className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700"
                  formAction={retryPublicationAction.bind(null, activePublication.id)}
                  formNoValidate
                  formMethod="post"
                  type="submit"
                >
                  Retry failed publication
                </button>
              ) : null}
              {activePublication?.status === "SCHEDULED" ? (
                <button
                  className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700"
                  formAction={cancelScheduledPublicationAction.bind(null, activePublication.id)}
                  formNoValidate
                  formMethod="post"
                  type="submit"
                >
                  Cancel schedule
                </button>
              ) : null}
            </div>
          </section>
        ) : null}

        {connections.map((connection) => {
          const state = overrides[connection.id];
          if (!state) return null;
          return (
            <div key={`hidden-${connection.id}`} className="hidden">
              {state.selected ? <input name="selectedConnectionIds" readOnly type="checkbox" defaultChecked value={connection.id} /> : null}
              <input name={`caption_${connection.id}`} readOnly value={state.caption} />
              <input name={`privacy_${connection.id}`} readOnly value={state.privacy} />
              <input name={`reply_${connection.id}`} readOnly value={state.reply} />
              <input name={`scheduledAt_${connection.id}`} readOnly value={state.scheduledAt} />
              {state.disableComment ? <input name={`disableComment_${connection.id}`} readOnly defaultChecked type="checkbox" value="true" /> : null}
              {state.autoMusic ? <input name={`autoMusic_${connection.id}`} readOnly defaultChecked type="checkbox" value="true" /> : null}
            </div>
          );
        })}

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <p className="text-sm text-slate-600">
            {summary.total === 0 ? (
              <span className="text-slate-500">Select at least one account to publish.</span>
            ) : (
              <>
                <span className="font-semibold text-slate-900">{summary.total}</span> account{summary.total === 1 ? "" : "s"} ready ·{" "}
                {summary.now > 0 ? <span>{summary.now} now</span> : null}
                {summary.now > 0 && summary.scheduled > 0 ? <span> · </span> : null}
                {summary.scheduled > 0 ? <span>{summary.scheduled} scheduled</span> : null}
              </>
            )}
          </p>
          <button
            className="rounded-full bg-slate-950 px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
            disabled={summary.total === 0 || overLimit}
            type="submit"
          >
            {summary.scheduled > 0 && summary.now === 0 ? "Schedule" : summary.scheduled > 0 ? "Publish & schedule" : "Publish now"}
          </button>
        </footer>
      </form>
    </div>
  );
}
