export default function HistorialLoading() {
  return (
    <div className="px-6 lg:px-10 py-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="h-8 w-32 rounded-lg bg-muted animate-pulse" />
          <div className="h-4 w-40 rounded bg-muted/60 animate-pulse" />
        </div>
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-7 w-14 rounded-md bg-muted/60 animate-pulse" style={{ animationDelay: `${i * 30}ms` }} />
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-4 px-4 h-10 border-b border-border/60">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-2.5 flex-1 rounded bg-muted/50 animate-pulse" />
          ))}
        </div>
        {[...Array(10)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border/40 last:border-0">
            <div className="w-14 h-3 rounded bg-muted/50 animate-pulse font-mono" style={{ animationDelay: `${i * 35}ms` }} />
            <div className="flex-1 h-3 rounded bg-muted/40 animate-pulse" style={{ animationDelay: `${i * 35 + 15}ms` }} />
            <div className="flex-1 h-3 rounded bg-muted/35 animate-pulse" style={{ animationDelay: `${i * 35 + 30}ms` }} />
            <div className="flex-1 h-3.5 w-1/2 rounded bg-muted/45 animate-pulse" style={{ animationDelay: `${i * 35 + 45}ms` }} />
            <div className="w-16 h-5 rounded-full bg-muted/40 animate-pulse" style={{ animationDelay: `${i * 35 + 60}ms` }} />
            <div className="flex-1 h-3.5 rounded bg-muted/50 animate-pulse text-right" style={{ animationDelay: `${i * 35 + 75}ms` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
