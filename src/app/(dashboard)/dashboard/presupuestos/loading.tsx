export default function PresupuestosLoading() {
  return (
    <div className="px-6 lg:px-10 py-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-44 bg-muted rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-muted/60 rounded animate-pulse" />
        </div>
        <div className="h-9 w-40 bg-muted rounded-lg animate-pulse" />
      </div>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="h-10 border-b border-border/60 bg-muted/20" />
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3.5 border-b border-border/40 last:border-0 animate-pulse"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="h-4 w-14 bg-muted rounded" />
            <div className="h-4 w-40 bg-muted rounded flex-1" />
            <div className="h-4 w-20 bg-muted rounded" />
            <div className="h-4 w-16 bg-muted rounded" />
            <div className="h-5 w-20 bg-muted rounded-full" />
            <div className="h-4 w-24 bg-muted rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
