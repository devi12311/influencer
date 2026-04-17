export const dynamic = "force-dynamic";

import Link from "next/link";
import { MediaImage } from "@/components/gallery/media-image";
import { auth } from "@/server/auth";
import { listPromptTagsByUser, listPromptsByUser } from "@/server/services/prompt";

export default async function PromptsPage({
  searchParams,
}: {
  searchParams: Promise<{ favorite?: string; search?: string; tag?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const favoriteOnly = params.favorite === "true";
  const prompts = session?.userId
    ? await listPromptsByUser({
        favoriteOnly,
        search: params.search,
        tag: params.tag,
        userId: session.userId,
      })
    : [];
  const tags = session?.userId ? await listPromptTagsByUser(session.userId) : [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">Library</p>
          <h1 className="text-3xl font-semibold text-slate-950">Prompt gallery</h1>
        </div>
        <Link className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white" href="/prompts/new">
          New prompt
        </Link>
      </div>

      <form className="grid gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 md:grid-cols-[1.4fr_1fr_auto]">
        <input
          className="rounded-xl border border-slate-300 px-4 py-3"
          defaultValue={params.search ?? ""}
          name="search"
          placeholder="Search title or prompt text"
        />
        <select className="rounded-xl border border-slate-300 px-4 py-3" defaultValue={params.tag ?? ""} name="tag">
          <option value="">All tags</option>
          {tags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700">
          <input defaultChecked={favoriteOnly} name="favorite" type="checkbox" value="true" />
          Favorites only
        </label>
        <button className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white md:col-span-3 md:w-fit" type="submit">
          Apply filters
        </button>
      </form>

      {prompts.length === 0 ? (
        <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">
          No prompts match the current filters yet.
        </section>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {prompts.map((prompt) => (
            <Link key={prompt.id} className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg" href={`/prompts/${prompt.id}`}>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-semibold text-slate-950">{prompt.title}</h2>
                {prompt.isFavorite ? <span className="text-xl text-amber-500">★</span> : null}
              </div>
              <p className="line-clamp-3 text-sm leading-7 text-slate-600">{prompt.text}</p>
              <div className="grid grid-cols-4 gap-2">
                {prompt.references.slice(0, 4).map((reference) => (
                  <div key={reference.id} className="aspect-square overflow-hidden rounded-2xl bg-slate-100">
                    <MediaImage alt={prompt.title} media={reference.mediaObject} size="thumb" />
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {prompt.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
