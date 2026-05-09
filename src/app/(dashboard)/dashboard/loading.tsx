export default function DashboardLoading() {
  return (
    <div className="px-6 lg:px-10 py-8 max-w-6xl mx-auto space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-24 rounded-lg bg-muted animate-pulse" />
        <div className="h-4 w-40 rounded bg-muted/60 animate-pulse" />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-24 rounded bg-muted animate-pulse" />
              <div className="h-7 w-7 rounded-lg bg-muted animate-pulse" />
            </div>
            <div className="h-8 w-32 rounded-lg bg-muted animate-pulse" />
            <div className="h-3 w-20 rounded bg-muted/60 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex gap-2">
        <div className="h-9 w-32 rounded-lg bg-muted animate-pulse" />
        <div className="h-9 w-24 rounded-lg bg-muted/60 animate-pulse" />
        <div className="h-9 w-24 rounded-lg bg-muted/60 animate-pulse" />
      </div>

      {/* Table */}
      <div className="space-y-4">
        <div className="h-5 w-32 rounded bg-muted animate-pulse" />
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <SkeletonTable cols={6} rows={6} />
        </div>
      </div>
    </div>
  );
}

function SkeletonTable({ cols, rows }: { cols: number; rows: number }) {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 px-4 h-10 border-b border-border/60">
        {[...Array(cols)].map((_, i) => (
          <div key={i} className="h-2.5 rounded bg-muted/50 animate-pulse flex-1" />
        ))}
      </div>
      {/* Rows */}
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border/40 last:border-0">
          {[...Array(cols)].map((_, j) => (
            <div
              key={j}
              className="h-3 rounded bg-muted/40 animate-pulse flex-1"
              style={{ animationDelay: `${i * 40 + j * 20}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
