import Papa from "papaparse";
import type { CsvRow, ParsedCsvTable } from "@/lib/importers/types";

export function cleanCell(value: unknown) {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/^[`']+/, "")
    .replace(/\t/g, "")
    .trim();
}

export function normalizeHeader(value: unknown) {
  return cleanCell(value)
    .replace(/[（]/g, "(")
    .replace(/[）]/g, ")")
    .replace(/[：]/g, ":")
    .replace(/[／]/g, "/")
    .replace(/\s+/g, "")
    .toLowerCase();
}

export function decodeCsvBuffer(buffer: ArrayBuffer, markers: string[]) {
  const bytes = new Uint8Array(buffer);
  const decoders = ["utf-8", "gb18030", "gbk"];

  for (const encoding of decoders) {
    try {
      const content = new TextDecoder(encoding, { fatal: false }).decode(bytes);
      if (!markers.length || markers.some((marker) => content.includes(marker))) {
        return content;
      }
    } catch {
      // Some runtimes may not support every legacy encoding label.
    }
  }

  throw new Error("文件编码无法解析");
}

export function normalizeLines(content: string) {
  return content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function extractTableByHeader(content: string, headerMatchers: Array<(line: string) => boolean>) {
  const lines = normalizeLines(content).split("\n");
  const headerIndex = lines.findIndex((line) => headerMatchers.some((matcher) => matcher(line)));

  if (headerIndex < 0) {
    return undefined;
  }

  return lines.slice(headerIndex).join("\n");
}

export function parseCsvTable(table: string): ParsedCsvTable {
  const parsed = Papa.parse<string[]>(table, {
    skipEmptyLines: true
  });
  const rows = parsed.data;
  const headers = rows[0]?.map(cleanCell) ?? [];

  return {
    headers,
    table,
    rows: rows.slice(1).map((cells) =>
      headers.reduce<CsvRow>((record, header, index) => {
        if (header) record[header] = cleanCell(cells[index]);
        return record;
      }, {})
    )
  };
}

export function parseAmount(value: string) {
  const normalized = cleanCell(value).replace(/[,\s￥¥元]/g, "");
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return undefined;
  return Math.abs(amount);
}

export function parseDate(value: string) {
  const cleaned = cleanCell(value);
  const excelSerial = Number(cleaned);
  if (/^\d+(?:\.\d+)?$/.test(cleaned) && Number.isFinite(excelSerial) && excelSerial > 20_000) {
    const milliseconds = Math.round((excelSerial - 25569) * 86400 * 1000);
    const date = new Date(milliseconds);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 19).replace("T", " ");
    }
  }

  const normalized = cleaned
    .replace(/[年/.]/g, "-")
    .replace(/月/g, "-")
    .replace(/日/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return `${normalized} 00:00:00`;
  return normalized;
}

export function includesAny(text: string, keywords: string[]) {
  const normalized = text.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}
