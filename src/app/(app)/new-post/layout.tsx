export const dynamic = "force-dynamic";

import type { ReactNode } from "react";

export default function NewPostLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2 rounded-[2rem] border border-slate-200 bg-white p-8">
        <p className="text-sm font-medium text-slate-500">Wizard</p>
        <h1 className="text-3xl font-semibold text-slate-950">Create new post</h1>
        <p className="text-sm leading-7 text-slate-600">Draft state is stored for 24 hours so you can leave and return without losing progress.</p>
      </div>
      {children}
    </div>
  );
}
