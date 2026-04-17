import { createPublicationsAction, retryPublicationAction } from "@/actions/post";

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

export function PublishPanel({
  connections,
  postId,
  publications,
}: {
  connections: Connection[];
  postId: string;
  publications: Publication[];
}) {
  return (
    <div className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6">
      <div>
        <p className="text-sm font-medium text-slate-500">Publish</p>
        <h2 className="text-2xl font-semibold text-slate-950">Compose per-platform publications</h2>
      </div>

      <form action={createPublicationsAction} className="space-y-4">
        <input name="postId" type="hidden" value={postId} />
        <div className="space-y-4">
          {connections.map((connection) => {
            const publication = publications.find((item) => item.socialConnection.id === connection.id);
            return (
              <section key={connection.id} className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <label className="flex items-center gap-3 text-sm font-medium text-slate-800">
                    <input defaultChecked={Boolean(publication)} name="selectedConnectionIds" type="checkbox" value={connection.id} />
                    <span>
                      {connection.platform}
                      {connection.displayName ? ` · ${connection.displayName}` : ""}
                    </span>
                  </label>
                  <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                    {publication?.status ?? "not configured"}
                  </span>
                </div>

                <label className="block space-y-2 text-sm font-medium text-slate-700">
                  Caption override
                  <textarea className="min-h-28 w-full rounded-xl border border-slate-300 px-4 py-3" defaultValue={publication?.caption ?? ""} name={`caption_${connection.id}`} />
                </label>

                <div className="grid gap-4 md:grid-cols-3">
                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    Privacy level
                    <input className="w-full rounded-xl border border-slate-300 px-4 py-3" defaultValue={String((publication?.options as Record<string, unknown> | undefined)?.privacy_level ?? "")} name={`privacy_${connection.id}`} />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    Reply control
                    <input className="w-full rounded-xl border border-slate-300 px-4 py-3" defaultValue={String((publication?.options as Record<string, unknown> | undefined)?.reply_control ?? "")} name={`reply_${connection.id}`} />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    Schedule time
                    <input className="w-full rounded-xl border border-slate-300 px-4 py-3" defaultValue={publication?.scheduledAt ? new Date(publication.scheduledAt).toISOString().slice(0, 16) : ""} name={`scheduledAt_${connection.id}`} type="datetime-local" />
                  </label>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-slate-700">
                  <label className="flex items-center gap-2">
                    <input defaultChecked={Boolean((publication?.options as Record<string, unknown> | undefined)?.disable_comment)} name={`disableComment_${connection.id}`} type="checkbox" value="true" />
                    Disable comments
                  </label>
                  {connection.platform === "TIKTOK" ? (
                    <label className="flex items-center gap-2">
                      <input defaultChecked={Boolean((publication?.options as Record<string, unknown> | undefined)?.auto_add_music)} name={`autoMusic_${connection.id}`} type="checkbox" value="true" />
                      Auto add music
                    </label>
                  ) : null}
                </div>

                {publication?.errorMessage ? <p className="text-sm text-red-600">{publication.errorMessage}</p> : null}
                {publication?.externalId ? <p className="text-sm text-slate-500">External ID: {publication.externalId}</p> : null}
                {publication?.status === "FAILED" ? (
                  <form action={retryPublicationAction}>
                    <input name="publicationId" type="hidden" value={publication.id} />
                    <button className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700" type="submit">
                      Retry failed publication
                    </button>
                  </form>
                ) : null}
              </section>
            );
          })}
        </div>
        <button className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white" type="submit">
          Publish now / schedule selected
        </button>
      </form>
    </div>
  );
}
