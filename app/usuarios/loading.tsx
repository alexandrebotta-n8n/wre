// Skeleton de /usuarios — exibido enquanto carrega lista (ADMIN only).
export default function Loading() {
  return (
    <div className="px-4 py-4 space-y-4 animate-pulse">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="h-7 w-28 rounded bg-neutral-200" />
          <div className="h-3 w-64 rounded bg-neutral-200 mt-2" />
        </div>
        <div className="h-8 w-32 rounded bg-neutral-200" />
      </div>
      <div className="rounded-lg border border-neutral-200 bg-white p-4 space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="grid grid-cols-12 gap-3 items-center py-2 border-b border-neutral-100 last:border-0">
            <div className="col-span-4 h-4 rounded bg-neutral-200" />
            <div className="col-span-3 h-4 rounded bg-neutral-100" />
            <div className="col-span-2 h-4 rounded bg-neutral-100" />
            <div className="col-span-2 h-4 rounded bg-neutral-100" />
            <div className="col-span-1 h-8 rounded bg-neutral-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
