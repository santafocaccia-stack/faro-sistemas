'use server';

export async function buscarEnOFF(codigo: string): Promise<string | null> {
  if (!codigo.trim()) return null;
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(codigo.trim())}.json`,
      { next: { revalidate: 86400 } },
    );
    if (!res.ok) return null;
    const data = await res.json() as {
      status: number;
      product?: { product_name_es?: string; product_name?: string };
    };
    if (data.status !== 1 || !data.product) return null;
    return data.product.product_name_es || data.product.product_name || null;
  } catch {
    return null;
  }
}
