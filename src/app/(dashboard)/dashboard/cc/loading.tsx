export default function CcLoading() {
  return (
    <div className="px-6 lg:px-10 py-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-44 rounded-lg bg-muted animate-pulse" />
        <div className="h-4 w-52 rounded bg-muted/60 animate-pulse" />
      </div>

      {/* KPI summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="h-3 w-24 rounded bg-muted/50 animate-pulse" />
            <div className="h-7 w-28 rounded-lg bg-muted animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-4 px-4 h-10 border-b border-border/60">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-2.5 flex-1 rounded bg-muted/50 animate-pulse" />
          ))}
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-border/40 last:border-0">
            <div className="flex-[2] space-y-1.5">
              <div className="h-3.5 w-3/5 rounded bg-muted/50 animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
              <div className="h-2.5 w-2/5 rounded bg-muted/30 animate-pulse" style={{ animationDelay: `${i * 50 + 20}ms` }} />
            </div>
            {[...Array(3)].map((_, j) => (
              <div key={j} className="flex-1 h-3 rounded bg-muted/40 animate-pulse" style={{ animationDelay: `${i * 50 + j * 20}ms` }} />
            ))}
            <div className="flex-1 h-4 w-16 rounded bg-muted/50 animate-pulse" style={{ animationDelay: `${i * 50 + 70}ms` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
