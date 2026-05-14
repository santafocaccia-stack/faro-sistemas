'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Reporta el error a Sentry automáticamente
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="text-center max-w-md">
        <div className="h-14 w-14 rounded-2xl bg-destructive/10 border border-destructive/20 mx-auto mb-5 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-destructive" strokeWidth={1.75} />
        </div>

        <h2 className="text-lg font-semibold tracking-tight mb-2">
          Algo salió mal
        </h2>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          Ocurrió un error inesperado. Ya registramos el problema automáticamente.
          {error.digest && (
            <span className="block mt-2 font-mono text-xs text-muted-foreground/60">
              ID: {error.digest}
            </span>
          )}
        </p>

        <Button onClick={reset} variant="outline" className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} />
          Reintentar
        </Button>
      </div>
    </div>
  );
}
