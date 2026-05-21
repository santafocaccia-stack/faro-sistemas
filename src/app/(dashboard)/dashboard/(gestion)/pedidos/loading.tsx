export default function PedidosLoading() {
  return (
    <div className="px-6 lg:px-10 py-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="h-8 w-24 rounded-lg bg-muted animate-pulse" />
          <div className="h-4 w-44 rounded bg-muted/60 animate-pulse" />
        </div>
        <div className="h-9 w-36 rounded-lg bg-muted animate-pulse" />
      </div>

      {/* Filtros de estado */}
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-8 w-24 rounded-full bg-muted/60 animate-pulse"
            style={{ animationDelay: `${i * 40}ms` }}
          />
        ))}
      </div>

      {/* Cards de pedidos */}
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-4 flex items-center gap-4"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="h-10 w-10 rounded-lg bg-muted animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 rounded bg-muted/70 animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-muted/40 animate-pulse" />
            </div>
            <div className="shrink-0 space-y-2 text-right">
              <div className="h-5 w-20 rounded-full bg-muted/60 animate-pulse" />
              <div className="h-3 w-16 rounded bg-muted/40 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
