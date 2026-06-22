/**
 * Transporte de impresión térmica: Web Bluetooth y WebUSB.
 * Recibe bytes ESC/POS (ver escpos.ts) y los manda a la impresora.
 *
 * Los APIs Web Bluetooth / WebUSB son experimentales y no están en los tipos
 * estándar de TS, por eso usamos casts laxos hacia `navigator`. La API pública
 * de este módulo sí queda tipada.
 *
 * Soporte: Chrome/Edge en Android y desktop. iOS NO soporta ninguno de los dos
 * (ahí la impresión va por window.print() / AirPrint).
 */

export type ModoImpresora = 'bluetooth' | 'usb';

type Estado = { modo: ModoImpresora; nombre: string };

const LS_KEY = 'gesto_impresora'; // recuerda el modo preferido para la UI

// Conexión viva (en memoria, no sobrevive recarga).
let btChar: { properties: { write: boolean; writeWithoutResponse: boolean }; writeValue: (d: BufferSource) => Promise<void>; writeValueWithoutResponse: (d: BufferSource) => Promise<void> } | null = null;
let usbDevice: { transferOut: (ep: number, d: BufferSource) => Promise<unknown>; claimInterface: (n: number) => Promise<void>; opened?: boolean } | null = null;
let usbEndpoint = 0;
let usbIface = 0;
let actual: Estado | null = null;

const nav = (): { bluetooth?: unknown; usb?: unknown } =>
  (typeof navigator !== 'undefined' ? navigator : {}) as never;

export function soportaBluetooth(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}
export function soportaUSB(): boolean {
  return typeof navigator !== 'undefined' && 'usb' in navigator;
}

export function estadoImpresora(): Estado | null {
  return actual;
}

/** Modo preferido guardado (solo para mostrar; la conexión hay que rehacerla). */
export function modoPreferido(): ModoImpresora | null {
  try { return (localStorage.getItem(LS_KEY) as ModoImpresora) || null; } catch { return null; }
}

function recordar(modo: ModoImpresora) {
  try { localStorage.setItem(LS_KEY, modo); } catch { /* noop */ }
}

export function olvidarImpresora() {
  btChar = null; usbDevice = null; actual = null;
  try { localStorage.removeItem(LS_KEY); } catch { /* noop */ }
}

// UUIDs de servicios comunes en impresoras térmicas BLE.
const BT_SERVICES: (number | string)[] = [
  0x18f0, 0xff00, 0xffe0,
  '000018f0-0000-1000-8000-00805f9b34fb',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
];

// ── Bluetooth ────────────────────────────────────────────────────────────────

export async function conectarBluetooth(): Promise<{ ok: boolean; nombre?: string; error?: string }> {
  if (!soportaBluetooth()) return { ok: false, error: 'Este navegador no soporta Bluetooth (probá Chrome en Android o PC).' };
  try {
    const bt = (nav().bluetooth) as { requestDevice: (o: unknown) => Promise<{ name?: string; gatt?: { connect: () => Promise<{ getPrimaryServices: () => Promise<{ getCharacteristics: () => Promise<typeof btChar[]> }[]> }> } }> };
    const device = await bt.requestDevice({ acceptAllDevices: true, optionalServices: BT_SERVICES });
    const server = await device.gatt!.connect();
    const services = await server.getPrimaryServices();
    for (const s of services) {
      const chars = await s.getCharacteristics();
      for (const c of chars) {
        if (c && (c.properties.write || c.properties.writeWithoutResponse)) {
          btChar = c; usbDevice = null;
          actual = { modo: 'bluetooth', nombre: device.name || 'Impresora Bluetooth' };
          recordar('bluetooth');
          return { ok: true, nombre: actual.nombre };
        }
      }
    }
    return { ok: false, error: 'No se encontró un canal de escritura en esa impresora.' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/cancel/i.test(msg)) return { ok: false, error: 'Conexión cancelada.' };
    return { ok: false, error: 'No se pudo conectar por Bluetooth.' };
  }
}

async function enviarBluetooth(data: Uint8Array): Promise<void> {
  if (!btChar) throw new Error('sin-conexion');
  const CHUNK = 180;
  for (let i = 0; i < data.length; i += CHUNK) {
    const slice = data.slice(i, i + CHUNK);
    if (btChar.properties.writeWithoutResponse) await btChar.writeValueWithoutResponse(slice);
    else await btChar.writeValue(slice);
    await new Promise((r) => setTimeout(r, 18));
  }
}

// ── USB ──────────────────────────────────────────────────────────────────────

export async function conectarUSB(): Promise<{ ok: boolean; nombre?: string; error?: string }> {
  if (!soportaUSB()) return { ok: false, error: 'Este navegador no soporta USB (probá Chrome en Android o PC).' };
  try {
    const usb = (nav().usb) as { requestDevice: (o: unknown) => Promise<Record<string, unknown>> };
    const device = await usb.requestDevice({ filters: [] }) as unknown as {
      productName?: string;
      open: () => Promise<void>;
      selectConfiguration: (n: number) => Promise<void>;
      configuration?: { interfaces: { interfaceNumber: number; alternates: { interfaceClass: number; endpoints: { direction: string; endpointNumber: number }[] }[] }[] };
      claimInterface: (n: number) => Promise<void>;
      transferOut: (ep: number, d: BufferSource) => Promise<unknown>;
    };
    await device.open();
    if (!device.configuration) await device.selectConfiguration(1);

    // Buscar interface de impresora (class 7) con endpoint OUT; fallback: cualquier OUT.
    let found = false;
    for (const iface of device.configuration!.interfaces) {
      const alt = iface.alternates[0]!;
      const out = alt.endpoints.find((e) => e.direction === 'out');
      if (out && (alt.interfaceClass === 7 || !found)) {
        usbIface = iface.interfaceNumber;
        usbEndpoint = out.endpointNumber;
        found = true;
        if (alt.interfaceClass === 7) break;
      }
    }
    if (!found) return { ok: false, error: 'Ese dispositivo no parece una impresora.' };

    await device.claimInterface(usbIface);
    usbDevice = device; btChar = null;
    actual = { modo: 'usb', nombre: device.productName || 'Impresora USB' };
    recordar('usb');
    return { ok: true, nombre: actual.nombre };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/cancel|no device/i.test(msg)) return { ok: false, error: 'Conexión cancelada.' };
    return { ok: false, error: 'No se pudo conectar por USB.' };
  }
}

async function enviarUSB(data: Uint8Array): Promise<void> {
  if (!usbDevice) throw new Error('sin-conexion');
  const CHUNK = 8 * 1024;
  for (let i = 0; i < data.length; i += CHUNK) {
    await usbDevice.transferOut(usbEndpoint, data.slice(i, i + CHUNK));
  }
}

// ── API de impresión ─────────────────────────────────────────────────────────

export async function imprimir(bytes: Uint8Array): Promise<{ ok: boolean; error?: string }> {
  try {
    if (actual?.modo === 'bluetooth' && btChar) { await enviarBluetooth(bytes); return { ok: true }; }
    if (actual?.modo === 'usb' && usbDevice) { await enviarUSB(bytes); return { ok: true }; }
    return { ok: false, error: 'No hay una impresora conectada.' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'sin-conexion') return { ok: false, error: 'No hay una impresora conectada.' };
    return { ok: false, error: 'No se pudo imprimir. Revisá que la impresora esté encendida.' };
  }
}
