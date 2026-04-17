const statusColors: Record<string, string> = {
  DRAFT: "bg-slate-300",
  FAILED: "bg-red-500",
  PUBLISHED: "bg-emerald-500",
  PUBLISHING: "bg-amber-500",
  SCHEDULED: "bg-blue-500",
};

export function PostStatusBadges({
  publications,
}: {
  publications: Array<{ id: string; platform: string; status: string }>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {publications.length === 0 ? <span className="text-xs text-slate-500">No publications yet</span> : null}
      {publications.map((publication) => (
        <span key={publication.id} className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700">
          <span className={`h-2 w-2 rounded-full ${statusColors[publication.status] ?? "bg-slate-300"}`} />
          {publication.platform}
        </span>
      ))}
    </div>
  );
}
