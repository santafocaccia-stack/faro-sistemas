import Link from 'next/link';
import { Plus, FileText, BookMarked, ChevronRight } from 'lucide-react';
import { listarPresupuestos, listarPlantillas } from '@/server/actions/presupuestos';
import { formatARS } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { UsarPlantillaButton } from '@/components/plantilla-button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

const ESTADO_BADGE: Record<string, { label: string; cls: string }> = {
  borrador:  { label: 'Borrador',  cls: 'bg-muted text-muted-foreground border-border/40' },
  enviado:   { label: 'Enviado',   cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  aprobado:  { label: 'Aprobado',  cls: 'bg-success/10 text-success border-success/20' },
  rechazado: { label: 'Rechazado', cls: 'bg-destructive/10 text-destructive border-destructive/20' },
  vencido:   { label: 'Vencido',   cls: 'bg-warning/10 text-warning border-warning/20' },
  cobrado:   { label: 'Cobrado',   cls: 'bg-success/10 text-success border-success/20' },
};

export default async function PresupuestosPage() {
  const [presupuestos, plantillas] = await Promise.all([listarPresupuestos(), listarPlantillas()]);

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-5xl mx-auto space-y-6 animate-fade-up">

      {/* Header */}
      <PageHeader
        icon={FileText}
        title="Presupuestos"
        subtitle="Creá y enviá presupuestos en PDF"
        action={
          <Button asChild className="glow-primary h-9">
            <Link href="/dashboard/presupuestos/nuevo">
              <Plus className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Nuevo presupuesto</span>
              <span className="sm:hidden">Nuevo</span>
            </Link>
          </Button>
        }
      />

      {/* Plantillas guardadas */}
      {plantillas.length > 0 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <BookMarked className="h-4 w-4 text-primary" strokeWidth={1.75} />
            <p className="text-sm font-medium text-primary">Plantillas guardadas</p>
            <span className="text-xs text-muted-foreground">— usá una para crear un presupuesto</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {plantillas.map((p) => (
              <div key={p.id} className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium truncate max-w-[180px]">{p.nombrePlantilla ?? '—'}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{formatARS(p.total)}</p>
                </div>
                <UsarPlantillaButton plantillaId={p.id} nombrePlantilla={p.nombrePlantilla ?? ''} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla */}
      {presupuestos.length === 0 ? (
        <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-20 text-center">
          <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center mb-4">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">Sin presupuestos</p>
          <p className="text-xs text-muted-foreground mt-1 mb-5">
            Creá tu primer presupuesto para enviárselo a un cliente
          </p>
          <Button asChild size="sm" className="glow-primary">
            <Link href="/dashboard/presupuestos/nuevo">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Crear presupuesto
            </Link>
          </Button>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          {/* Mobile: tarjetas */}
          <ul className="md:hidden divide-y divide-border/50 stagger">
            {presupuestos.map((p) => {
              const badge = ESTADO_BADGE[p.estado] ?? ESTADO_BADGE.borrador!;
              const fecha = new Date(p.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
              return (
                <li key={p.id}>
                  <Link href={`/dashboard/presupuestos/${p.id}`} className="list-row flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium truncate">{p.clienteDisplay}</p>
                      <p className="text-[11px] text-muted-foreground">
                        #{String(p.numero).padStart(5, '0')} · {fecha}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="font-mono tabular-nums text-[13px] font-semibold">{formatARS(p.total)}</span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold border uppercase tracking-wide ${badge.cls}`}>{badge.label}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Desktop: tabla */}
          <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border/60">
                <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 pl-4 w-20">#</TableHead>
                <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">Cliente</TableHead>
                <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">Fecha</TableHead>
                <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">Validez</TableHead>
                <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">Estado</TableHead>
                <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 text-right pr-4">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {presupuestos.map((p) => {
                const badge = ESTADO_BADGE[p.estado] ?? ESTADO_BADGE.borrador!;
                const fecha = new Date(p.fecha).toLocaleDateString('es-AR', {
                  day: '2-digit', month: '2-digit', year: '2-digit',
                });
                return (
                  <TableRow
                    key={p.id}
                    className="relative hover:bg-foreground/[0.02] border-b border-border/40 last:border-0 cursor-pointer"
                  >
                    <TableCell className="pl-4 py-3">
                      <Link href={`/dashboard/presupuestos/${p.id}`} className="block font-mono text-xs text-muted-foreground hover:text-foreground transition-colors before:absolute before:inset-0 before:content-['']">
                        {String(p.numero).padStart(5, '0')}
                      </Link>
                    </TableCell>
                    <TableCell className="py-3">
                      <Link href={`/dashboard/presupuestos/${p.id}`} className="block text-[13px] font-medium hover:text-primary transition-colors">
                        {p.clienteDisplay}
                      </Link>
                    </TableCell>
                    <TableCell className="py-3 text-[13px] text-muted-foreground">{fecha}</TableCell>
                    <TableCell className="py-3 text-[13px] text-muted-foreground">{p.validezDias} días</TableCell>
                    <TableCell className="py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border uppercase tracking-wide ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </TableCell>
                    <TableCell className="pr-4 py-3 text-right font-mono tabular-nums text-[13px] font-semibold">
                      {formatARS(p.total)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        </div>
      )}
    </div>
  );
}
