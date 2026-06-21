/**
 * Datos para el cobro por transferencia bancaria.
 *
 * Los datos de la cuenta de cobro viven en env vars (se cambian sin redeploy
 * de código): TRANSFER_TITULAR, TRANSFER_BANCO, TRANSFER_CBU, TRANSFER_ALIAS,
 * TRANSFER_CUIT. El monto se calcula al momento: precio USD × dólar MEP del día.
 */
import { PLANES, type PlanId } from '@/lib/planes';

export type DatosTransferencia = {
  titular: string;
  banco: string;
  cbu: string;
  alias: string;
  cuit: string;
  configurada: boolean; // hay al menos CBU o alias cargado
};

export function getDatosTransferencia(): DatosTransferencia {
  const cbu = process.env.TRANSFER_CBU ?? '';
  const alias = process.env.TRANSFER_ALIAS ?? '';
  return {
    titular: process.env.TRANSFER_TITULAR ?? '',
    banco: process.env.TRANSFER_BANCO ?? '',
    cbu,
    alias,
    cuit: process.env.TRANSFER_CUIT ?? '',
    configurada: Boolean(cbu || alias),
  };
}

/** Monto a transferir en pesos, redondeado, para un plan al dólar MEP del día. */
export function montoArsPlan(planId: PlanId, dolarMep: number): number {
  return Math.round(PLANES[planId].precioUsd * dolarMep);
}
