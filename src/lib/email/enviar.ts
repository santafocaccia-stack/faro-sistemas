/**
 * Envío de email transaccional vía Resend.
 *
 * Si RESEND_API_KEY no está configurada (caso actual en prod hasta cargar la
 * key), NO rompe: loguea un warning y devuelve { ok:false, skipped:true }.
 * Así el flujo de suscripción funciona aunque el email todavía no salga.
 */
import { Resend } from 'resend';

const FROM = 'Gesto <noreply@usegesto.app>';

export type EnvioResult = { ok: boolean; skipped?: boolean; error?: string };

export async function enviarEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<EnvioResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn(`[email] RESEND_API_KEY no configurada — email omitido: "${opts.subject}"`);
    return { ok: false, skipped: true };
  }

  try {
    const resend = new Resend(key);
    await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      replyTo: opts.replyTo,
    });
    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[email] Error enviando "${opts.subject}":`, error);
    return { ok: false, error };
  }
}
