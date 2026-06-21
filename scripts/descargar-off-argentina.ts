/**
 * Descarga códigos de barras + nombres de productos argentinos desde Open Food Facts.
 * Estrategia: descarga el dump CSV global y filtra por país Argentina en streaming.
 * Genera: scripts/output/productos-off-argentina.csv
 *
 * Uso: npx tsx scripts/descargar-off-argentina.ts
 */

import fs from "fs";
import path from "path";
import zlib from "zlib";
import { pipeline } from "stream/promises";
import { Readable } from "stream";

const OUTPUT_DIR = path.join(__dirname, "output");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "productos-off-argentina.csv");
const DUMP_URL = "https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz";

// Índices de columnas en el CSV de OFF (chequeados contra su schema)
// Las primeras columnas son: code, url, creator, created_t, created_datetime,
// last_modified_t, last_modified_datetime, product_name, ...
// countries_tags está en índice variable — lo detectamos del header.
let COL_CODE = -1;
let COL_NAME = -1;
let COL_COUNTRIES = -1;

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "\t" && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log("Descargando dump de Open Food Facts (puede tardar unos minutos)...");
  console.log("El archivo comprimido pesa ~1.5 GB — se procesa en streaming, sin guardar el .gz.\n");

  const res = await fetch(DUMP_URL, {
    headers: { "User-Agent": "Gesto/1.0 (faro-sistemas; contacto@faro-sistemas.com)" },
  });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status} al descargar dump`);

  const writeStream = fs.createWriteStream(OUTPUT_FILE, { encoding: "utf-8" });
  writeStream.write("codigo_barras,nombre_producto\n");

  const gunzip = zlib.createGunzip();
  let buffer = "";
  let lineCount = 0;
  let saved = 0;
  let skipped = 0;
  let headerParsed = false;
  let bytesDown = 0;

  const nodeReadable = Readable.fromWeb(res.body as import("stream/web").ReadableStream);

  nodeReadable.on("data", (chunk: Buffer) => {
    bytesDown += chunk.length;
    if (lineCount % 50000 === 0 || lineCount < 5) {
      process.stdout.write(`\rDescargados: ${(bytesDown / 1024 / 1024).toFixed(0)} MB | Procesados: ${lineCount.toLocaleString()} | Guardados AR: ${saved.toLocaleString()}`);
    }
  });

  gunzip.on("data", (chunk: Buffer) => {
    buffer += chunk.toString("utf-8");
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      lineCount++;

      const cols = parseCSVLine(line);

      if (!headerParsed) {
        COL_CODE = cols.indexOf("code");
        COL_NAME = cols.indexOf("product_name");
        COL_COUNTRIES = cols.indexOf("countries_tags");
        if (COL_CODE === -1 || COL_NAME === -1 || COL_COUNTRIES === -1) {
          throw new Error(`Header inesperado. code=${COL_CODE}, product_name=${COL_NAME}, countries_tags=${COL_COUNTRIES}\nPrimeras cols: ${cols.slice(0, 10).join(" | ")}`);
        }
        console.log(`\nHeader OK — code[${COL_CODE}], product_name[${COL_NAME}], countries_tags[${COL_COUNTRIES}]`);
        headerParsed = true;
        continue;
      }

      const countries = cols[COL_COUNTRIES] ?? "";
      if (!countries.includes("en:argentina")) { skipped++; continue; }

      const code = cols[COL_CODE]?.trim();
      const name = cols[COL_NAME]?.trim();
      if (!code || !name) { skipped++; continue; }

      writeStream.write(`${escapeCsv(code)},${escapeCsv(name)}\n`);
      saved++;
    }
  });

  await pipeline(nodeReadable, gunzip);

  // Procesar último buffer si quedó algo
  if (buffer.trim()) {
    const cols = parseCSVLine(buffer);
    const countries = cols[COL_COUNTRIES] ?? "";
    if (countries.includes("en:argentina")) {
      const code = cols[COL_CODE]?.trim();
      const name = cols[COL_NAME]?.trim();
      if (code && name) { writeStream.write(`${escapeCsv(code)},${escapeCsv(name)}\n`); saved++; }
    }
  }

  writeStream.end();

  console.log(`\n\nListo.`);
  console.log(`  Total líneas procesadas: ${lineCount.toLocaleString()}`);
  console.log(`  Guardados (Argentina)  : ${saved.toLocaleString()}`);
  console.log(`  Archivo                : ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
