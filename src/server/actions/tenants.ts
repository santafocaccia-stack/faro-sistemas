'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/server/db';
import { tenants, users, usersTenants, clientes } from '@/server/db/schema';

type CrearTenantInput = {
  nombreNegocio: string;
  habilitaMayorista: boolean;
  habilitaMinorista: boolean;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export async function crearTenant(input: CrearTenantInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const slug = `${slugify(input.nombreNegocio)}-${Date.now()}`;

  await db.transaction(async (tx) => {
    // 1. Crear el tenant
    const [tenant] = await tx.insert(tenants).values({
      nombre: input.nombreNegocio,
      slug,
      habilitaMayorista: input.habilitaMayorista,
      habilitaMinorista: input.habilitaMinorista,
    }).returning({ id: tenants.id });

    if (!tenant) throw new Error('Error al crear el tenant');

    // 2. Crear el registro del usuario en nuestra tabla
    await tx.insert(users).values({
      id: user.id,
      email: user.email!,
    }).onConflictDoNothing();

    // 3. Vincularlo como owner del tenant
    await tx.insert(usersTenants).values({
      userId: user.id,
      tenantId: tenant.id,
      rol: 'owner',
    });

    // 4. Bootstrap: crear el cliente "Consumidor Final" del tenant
    await tx.insert(clientes).values({
      tenantId: tenant.id,
      razonSocial: 'Consumidor Final',
      tipo: 'minorista',
      condicionIva: 'consumidor_final',
      esConsumidorFinal: true,
      habilitaCuentaCorriente: false,
    });
  });

  redirect('/dashboard');
}
