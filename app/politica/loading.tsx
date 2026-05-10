// Skeleton da página /politica — feedback visual durante navegação entre temas.
export default function Loading() {
  return (
    <div className="px-4 py-6 space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-2/3 rounded bg-neutral-200" />
        <div className="h-4 w-1/2 rounded bg-neutral-200" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg border border-neutral-200 bg-neutral-50" />
        ))}
      </div>
      <div className="h-72 rounded-lg border border-neutral-200 bg-neutral-50" />
    </div>
  );
}
