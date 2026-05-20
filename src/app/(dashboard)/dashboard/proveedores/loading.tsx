function SkeletonRow({ cols, delay }: { cols: number; delay: number }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 border-b border-border/40 last:border-0">
      {[...Array(cols)].map((_, j) => (
        <div
          key={j}
          className="h-3 rounded bg-muted/40 animate-pulse flex-1"
          style={{ animationDelay: `${delay + j * 20}ms` }}
        />
      ))}
    </div>
  );
}

export default function ProveedoresLoading() {
  return (
    <div className="px-6 lg:px-10 py-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="h-8 w-32 rounded-lg bg-muted animate-pulse" />
          <div className="h-4 w-48 rounded bg-muted/60 animate-pulse" />
        </div>
        <div className="h-9 w-40 rounded-lg bg-muted animate-pulse" />
      </div>

      {/* Search */}
      <div className="h-9 w-64 rounded-lg bg-muted/60 animate-pulse" />

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-4 px-4 h-10 border-b border-border/60">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-2.5 flex-1 rounded bg-muted/50 animate-pulse" />
          ))}
        </div>
        {[...Array(7)].map((_, i) => (
          <SkeletonRow key={i} cols={5} delay={i * 50} />
        ))}
      </div>
    </div>
  );
}
