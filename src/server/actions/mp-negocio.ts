'use server';

import { eq } from 'drizzle-orm';
import { requireSession } from '@/server/auth/session';
import { db } from '@/server/db';
import { tenants } from '@/server/db/schema';

// NOTA: el helper para LEER el token OAuth de MP del negocio vive en
// `src/server/mp/token.ts` (módulo server-only, NO action). No agregar acá
// funciones que devuelvan secretos: todo lo exportado de este archivo es un
// endpoint HTTP invocable.

export async function desconectarMP() {
  const session = await requireSession();
  await db
    .update(tenants)
    .set({
      mpNegocioAccessToken:  null,
      mpNegocioRefreshToken: null,
      mpNegocioTokenExpiry:  null,
      mpNegocioUserId:       null,
    })
    .where(eq(tenants.id, session.tenantId));
}
