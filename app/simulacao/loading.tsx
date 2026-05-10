// Skeleton da página /simulacao — exibido enquanto SSR carrega cenários A/B.
export default function Loading() {
  return (
    <div className="px-4 py-4 space-y-4 animate-pulse">
      <div className="flex items-center justify-between gap-3">
        <div className="h-8 w-48 rounded bg-neutral-200" />
        <div className="flex gap-2">
          <div className="h-8 w-32 rounded bg-neutral-200" />
          <div className="h-8 w-28 rounded bg-neutral-200" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-lg border border-neutral-200 bg-white p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-5 w-16 rounded bg-neutral-200" />
              <div className="h-5 w-20 rounded bg-neutral-200" />
            </div>
            <div className="h-6 w-2/3 rounded bg-neutral-200" />
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-neutral-100">
              <div className="h-12 rounded bg-neutral-100" />
              <div className="h-12 rounded bg-neutral-100" />
              <div className="h-12 rounded bg-neutral-100" />
            </div>
            <div className="h-32 rounded bg-neutral-100" />
            <div className="h-40 rounded bg-neutral-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
