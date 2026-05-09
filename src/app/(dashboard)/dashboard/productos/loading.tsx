export default function ProductosLoading() {
  return (
    <div className="px-6 lg:px-10 py-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="h-8 w-32 rounded-lg bg-muted animate-pulse" />
          <div className="h-4 w-48 rounded bg-muted/60 animate-pulse" />
        </div>
        <div className="h-9 w-36 rounded-lg bg-muted animate-pulse" />
      </div>

      {/* Toolbar */}
      <div className="flex gap-2">
        <div className="h-9 flex-1 max-w-xs rounded-lg bg-muted/60 animate-pulse" />
        <div className="h-9 w-28 rounded-lg bg-muted/50 animate-pulse" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-4 px-4 h-10 border-b border-border/60">
          {[40, 60, 30, 40, 40, 30].map((w, i) => (
            <div key={i} className="h-2.5 rounded bg-muted/50 animate-pulse" style={{ width: `${w}%`, flex: i === 0 ? 2 : 1 }} />
          ))}
        </div>
        {/* Rows */}
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-border/40 last:border-0">
            <div className="flex-[2] space-y-1.5">
              <div className="h-3.5 w-3/4 rounded bg-muted/50 animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
              <div className="h-2.5 w-1/3 rounded bg-muted/30 animate-pulse" style={{ animationDelay: `${i * 50 + 20}ms` }} />
            </div>
            {[...Array(4)].map((_, j) => (
              <div key={j} className="flex-1 h-3 rounded bg-muted/40 animate-pulse" style={{ animationDelay: `${i * 50 + j * 15}ms` }} />
            ))}
            <div className="w-16 h-5 rounded-full bg-muted/40 animate-pulse" style={{ animationDelay: `${i * 50 + 80}ms` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
