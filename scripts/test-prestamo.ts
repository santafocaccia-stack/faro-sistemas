/**
 * Test rápido del motor de cálculo de préstamos.
 * Ejecutar: npx tsx scripts/test-prestamo.ts
 */
import { generarCronograma, calcularMora, imputarPago } from '../src/lib/prestamos';

console.log('=== Préstamo: $100.000, 120% anual, 12 cuotas mensuales, sistema francés ===');
const cron = generarCronograma({
  capital: 100000,
  tasaNominalAnualPct: 120,
  cantidadCuotas: 12,
  frecuencia: 'mensual',
  sistema: 'frances',
  fechaPrimerVencimiento: new Date('2026-07-01'),
});
console.table(
  cron.map((c) => ({
    n: c.numero,
    cuota: c.montoCuota,
    capital: c.capital,
    interes: c.interes,
    saldo: c.saldoPosterior,
  })),
);
const totalDevuelto = cron.reduce((a, c) => a + c.montoCuota, 0);
console.log('Cuota fija:', cron[0]!.montoCuota);
console.log('Saldo final (debe ser 0):', cron[cron.length - 1]!.saldoPosterior);
console.log('Total devuelto:', totalDevuelto.toFixed(2), '(capital + interés)');

console.log('\n=== Mora: cuota de $10.000 vencida hace 30 días, 60% punitorio anual, 0 gracia ===');
const mora = calcularMora(10000, new Date('2026-05-01'), new Date('2026-05-31'), 60, 0);
console.log('Mora:', mora, '(esperado ~493 = 10000 * 0.6/365 * 30)');

console.log('\n=== Imputación de $5.000 a cuota con mora $500, interés $3.000, capital $4.000 ===');
console.log(imputarPago(5000, { mora: 500, interes: 3000, capital: 4000 }));
console.log('(esperado: mora 500, interés 3000, capital 1500, sobrante 0)');
