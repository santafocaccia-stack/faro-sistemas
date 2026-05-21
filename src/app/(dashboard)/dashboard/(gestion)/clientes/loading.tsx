export default function ClientesLoading() {
  return (
    <div className="px-6 lg:px-10 py-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="h-8 w-28 rounded-lg bg-muted animate-pulse" />
          <div className="h-4 w-44 rounded bg-muted/60 animate-pulse" />
        </div>
        <div className="h-9 w-36 rounded-lg bg-muted animate-pulse" />
      </div>

      {/* Search */}
      <div className="h-9 flex-1 max-w-xs rounded-lg bg-muted/60 animate-pulse" />

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-4 px-4 h-10 border-b border-border/60">
          {[50, 30, 30, 30, 30].map((_, i) => (
            <div key={i} className="h-2.5 flex-1 rounded bg-muted/50 animate-pulse" />
          ))}
        </div>
        {[...Array(7)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-border/40 last:border-0">
            <div className="flex-[2] space-y-1.5">
              <div className="h-3.5 w-2/3 rounded bg-muted/50 animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
              <div className="h-2.5 w-1/2 rounded bg-muted/30 animate-pulse" style={{ animationDelay: `${i * 50 + 20}ms` }} />
            </div>
            <div className="flex-1 h-5 w-16 rounded-full bg-muted/40 animate-pulse" style={{ animationDelay: `${i * 50 + 30}ms` }} />
            <div className="flex-1 h-3 rounded bg-muted/40 animate-pulse" style={{ animationDelay: `${i * 50 + 45}ms` }} />
            <div className="flex-1 h-3 rounded bg-muted/40 animate-pulse" style={{ animationDelay: `${i * 50 + 60}ms` }} />
            <div className="flex-1 h-3 rounded bg-muted/30 animate-pulse text-right" style={{ animationDelay: `${i * 50 + 75}ms` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
