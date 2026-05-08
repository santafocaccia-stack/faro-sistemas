'use client';

import { useState } from 'react';
import { crearTenant } from '@/server/actions/tenants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function OnboardingPage() {
  const [nombre, setNombre] = useState('');
  const [mayorista, setMayorista] = useState(true);
  const [minorista, setMinorista] = useState(true);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await crearTenant({
      nombreNegocio: nombre,
      habilitaMayorista: mayorista,
      habilitaMinorista: minorista,
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Configurá tu negocio</CardTitle>
          <CardDescription>
            Estos datos se pueden cambiar después desde la configuración.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-1">
              <Label htmlFor="nombre">Nombre del negocio</Label>
              <Input
                id="nombre"
                placeholder="Ej: Carnicería El Gaucho"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>

            <div className="space-y-3">
              <Label>¿Qué tipo de ventas hacés?</Label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={minorista}
                  onChange={(e) => setMinorista(e.target.checked)}
                  className="h-4 w-4 rounded border"
                />
                <span className="text-sm">
                  <strong>Minorista</strong> — venta por mostrador al consumidor final
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mayorista}
                  onChange={(e) => setMayorista(e.target.checked)}
                  className="h-4 w-4 rounded border"
                />
                <span className="text-sm">
                  <strong>Mayorista</strong> — venta a otros negocios o revendedores
                </span>
              </label>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={loading || (!mayorista && !minorista)}
            >
              {loading ? 'Creando tu negocio...' : 'Empezar'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
