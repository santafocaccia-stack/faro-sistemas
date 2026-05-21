export default function ReportesLoading() {
  return (
    <div className="px-6 lg:px-10 py-8 max-w-6xl mx-auto space-y-8">
      {/* Header + period pills */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div className="space-y-2">
          <div className="h-8 w-28 rounded-lg bg-muted animate-pulse" />
          <div className="h-4 w-48 rounded bg-muted/60 animate-pulse" />
        </div>
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-7 w-16 rounded-md bg-muted/60 animate-pulse" style={{ animationDelay: `${i * 40}ms` }} />
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 rounded bg-muted/50 animate-pulse" />
              <div className="h-7 w-7 rounded-lg bg-muted/40 animate-pulse" />
            </div>
            <div className="h-7 w-28 rounded-lg bg-muted animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
            <div className="h-3 w-16 rounded bg-muted/40 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Two column sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border/60 space-y-1">
              <div className="h-4 w-28 rounded bg-muted/60 animate-pulse" />
              <div className="h-3 w-40 rounded bg-muted/40 animate-pulse" />
            </div>
            {[...Array(5)].map((_, j) => (
              <div key={j} className="px-4 py-3 border-b border-border/40 last:border-0 space-y-2">
                <div className="flex justify-between">
                  <div className="h-3.5 w-1/2 rounded bg-muted/50 animate-pulse" style={{ animationDelay: `${j * 40}ms` }} />
                  <div className="h-3.5 w-16 rounded bg-muted/40 animate-pulse" style={{ animationDelay: `${j * 40 + 20}ms` }} />
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-muted-foreground/20 rounded-full animate-pulse"
                    style={{ width: `${Math.random() * 60 + 20}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Daily breakdown */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60 space-y-1">
          <div className="h-4 w-32 rounded bg-muted/60 animate-pulse" />
          <div className="h-3 w-48 rounded bg-muted/40 animate-pulse" />
        </div>
        {[...Array(7)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border/40 last:border-0">
            <div className="w-16 h-3 rounded bg-muted/50 animate-pulse" style={{ animationDelay: `${i * 40}ms` }} />
            <div className="flex-1 h-1.5 rounded-full bg-muted animate-pulse" />
            {[...Array(3)].map((_, j) => (
              <div key={j} className="w-20 h-3 rounded bg-muted/40 animate-pulse" style={{ animationDelay: `${i * 40 + j * 20}ms` }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
