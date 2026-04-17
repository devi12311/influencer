"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body className="bg-slate-100 p-8 text-slate-900">
        <div className="mx-auto max-w-2xl space-y-4 rounded-3xl border border-slate-200 bg-white p-8">
          <p className="text-sm font-medium text-slate-500">Something went wrong</p>
          <h1 className="text-3xl font-semibold">Unexpected application error</h1>
          <p className="text-sm leading-7 text-slate-600">
            A crash-reporting stub is available server-side for future Sentry-style integration. Try the action again or return to the dashboard.
          </p>
          <button className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white" onClick={() => reset()} type="button">
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
