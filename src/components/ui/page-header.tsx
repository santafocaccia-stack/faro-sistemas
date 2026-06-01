import type { LucideIcon } from 'lucide-react';

/**
 * Encabezado de página de 2 niveles: chip de ícono teñido por el acento del
 * plan + título + subtítulo, con la acción principal compacta a la derecha.
 * Reemplaza los headers donde el título competía con un botón gigante.
 */
export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <span className="icon-chip size-10 shrink-0">
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-[21px] sm:text-[25px] font-semibold tracking-tight leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-[13px] text-muted-foreground mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
