export const dynamic = "force-dynamic";

import { connectSelectedFacebookPages } from "@/actions/connection";
import { getPendingFacebookPagesSelection } from "@/server/providers/facebook/pending-pages";

export default async function FacebookPageSelectionPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const selection = params.token ? await getPendingFacebookPagesSelection(params.token) : null;

  if (!params.token || !selection) {
    return (
      <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">
        The Facebook page selection expired. Please reconnect your Facebook account.
      </section>
    );
  }

  return (
    <form action={connectSelectedFacebookPages} className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-8">
      <input name="token" type="hidden" value={params.token} />
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-500">Facebook Pages</p>
        <h2 className="text-3xl font-semibold text-slate-950">Select pages to connect</h2>
        <p className="text-sm leading-7 text-slate-600">
          Choose one or more Pages. A separate social connection will be created for each selected Page.
        </p>
      </div>

      <div className="space-y-3">
        {selection.pages.map((page) => (
          <label key={page.id} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <input defaultChecked name="pageIds" type="checkbox" value={page.id} />
            <div>
              <p className="font-medium text-slate-900">{page.name}</p>
              <p className="text-sm text-slate-600">Page ID: {page.id}</p>
              {page.category ? <p className="text-sm text-slate-600">Category: {page.category}</p> : null}
            </div>
          </label>
        ))}
      </div>

      <button className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white" type="submit">
        Connect selected pages
      </button>
    </form>
  );
}
