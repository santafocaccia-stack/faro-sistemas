export async function getDolarMep(): Promise<number> {
  try {
    const res = await fetch('https://dolarapi.com/v1/dolares/bolsa', {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error('fetch failed');
    const data = await res.json();
    const venta = Number(data.venta);
    return venta > 0 ? venta : 1200;
  } catch {
    return 1200;
  }
}
