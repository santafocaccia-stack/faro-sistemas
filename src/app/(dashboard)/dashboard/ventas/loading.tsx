/* Skeleton del POS — layout split: grilla izquierda + carrito derecho */
export default function VentasLoading() {
  return (
    <div className="h-full flex overflow-hidden">

      {/* ── Panel izquierdo: grilla de productos ─────────────── */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-border/60">

        {/* Barra superior: switch canal + búsqueda + scanner */}
        <div className="shrink-0 px-4 py-3 border-b border-border/60 flex items-center gap-3">
          <div className="h-9 w-48 rounded-xl bg-muted animate-pulse" />
          <div className="flex-1 h-9 rounded-xl bg-muted/60 animate-pulse" />
          <div className="h-9 w-9 rounded-xl bg-muted/40 animate-pulse" />
        </div>

        {/* Chips de categoría */}
        <div className="shrink-0 px-4 py-2 flex gap-2 overflow-hidden">
          {[60, 80, 70, 55, 75].map((w, i) => (
            <div
              key={i}
              className="h-7 rounded-full bg-muted/60 animate-pulse shrink-0"
              style={{ width: w, animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>

        {/* Grilla de tarjetas */}
        <div className="flex-1 overflow-hidden p-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {[...Array(15)].map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-border/60 bg-card p-3 space-y-2"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
                <div className="h-3 w-4/5 rounded bg-muted/70 animate-pulse" />
                <div className="h-3 w-3/5 rounded bg-muted/50 animate-pulse" />
                <div className="h-5 w-2/3 rounded-md bg-muted/60 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Panel derecho: carrito — solo desktop ────────────── */}
      <div className="hidden md:flex w-80 xl:w-96 shrink-0 flex-col">
        {/* Header carrito */}
        <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-muted/60 animate-pulse" />
          <div className="h-4 w-16 rounded bg-muted/60 animate-pulse" />
        </div>

        {/* Empty cart placeholder */}
        <div className="flex-1 flex items-center justify-center">
          <div className="space-y-3 text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted/40 animate-pulse mx-auto" />
            <div className="h-3 w-24 rounded bg-muted/40 animate-pulse mx-auto" />
          </div>
        </div>

        {/* Footer cobro */}
        <div className="shrink-0 border-t border-border p-4 space-y-3">
          <div className="h-9 w-full rounded-lg bg-muted/60 animate-pulse" />
          <div className="flex items-center justify-between">
            <div className="h-4 w-12 rounded bg-muted/50 animate-pulse" />
            <div className="h-7 w-28 rounded-lg bg-muted animate-pulse" />
          </div>
          <div className="h-12 w-full rounded-xl bg-muted animate-pulse" />
        </div>
      </div>
    </div>
  );
}
