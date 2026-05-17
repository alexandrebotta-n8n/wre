// Skeleton de /premissas — exibido enquanto carrega lista de premissas.
export default function Loading() {
  return (
    <div className="px-4 py-4 space-y-4 animate-pulse">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="h-7 w-36 rounded bg-neutral-200" />
          <div className="h-3 w-72 rounded bg-neutral-200 mt-2" />
        </div>
        <div className="h-8 w-32 rounded bg-neutral-200" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-neutral-200 bg-white p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-5 w-16 rounded bg-neutral-200" />
              <div className="h-5 w-24 rounded bg-neutral-100" />
            </div>
            <div className="h-5 w-2/3 rounded bg-neutral-200" />
            <div className="h-3 w-full rounded bg-neutral-100" />
            <div className="h-3 w-1/2 rounded bg-neutral-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
