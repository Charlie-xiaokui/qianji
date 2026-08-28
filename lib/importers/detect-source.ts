import { decodeCsvBuffer } from "@/lib/importers/csv";
import { isAlipayCsvContent, parseAlipayCsvContent } from "@/lib/importers/alipay";
import type { ImporterResult } from "@/lib/importers/types";
import { isWechatCsvContent, parseWechatCsvContent } from "@/lib/importers/wechat";
import * as XLSX from "xlsx";

const csvMarkers = ["交易时间", "交易分类", "交易对方", "微信支付账单", "支付宝交易明细"];
const supportedExtensions = new Set([".csv", ".xlsx", ".xls"]);

function getFileExtension(fileName: string) {
  const match = fileName.toLowerCase().match(/\.[^.]+$/);
  return match?.[0] ?? "";
}

function assertSupportedFileName(fileName: string) {
  if (!supportedExtensions.has(getFileExtension(fileName))) {
    throw new Error("当前只支持 CSV、XLSX 或 XLS 格式的支付宝/微信账单");
  }
}

function parseContent(content: string): ImporterResult | undefined {
  if (isAlipayCsvContent(content)) {
    return {
      source: "alipay",
      transactions: parseAlipayCsvContent(content)
    };
  }

  if (isWechatCsvContent(content)) {
    return {
      source: "wechat",
      transactions: parseWechatCsvContent(content)
    };
  }

  return undefined;
}

function parseExcelWorkbook(buffer: ArrayBuffer): ImporterResult | undefined {
  let workbook: XLSX.WorkBook;

  try {
    workbook = XLSX.read(buffer, {
      type: "array",
      cellDates: true,
      dateNF: "yyyy-mm-dd hh:mm:ss",
      raw: false
    });
  } catch {
    throw new Error("Excel 账单读取失败，请确认文件未损坏且格式为 XLSX 或 XLS");
  }

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const content = XLSX.utils.sheet_to_csv(sheet, {
      blankrows: true,
      dateNF: "yyyy-mm-dd hh:mm:ss"
    });
    const result = parseContent(content);
    if (result) return result;
  }

  return undefined;
}

export function parseBillFile(buffer: ArrayBuffer, fileName: string): ImporterResult {
  assertSupportedFileName(fileName);
  const extension = getFileExtension(fileName);
  const result =
    extension === ".csv"
      ? parseContent(decodeCsvBuffer(buffer, csvMarkers))
      : parseExcelWorkbook(buffer);

  if (result) return result;

  throw new Error("无法判断账单来源，请上传支付宝或微信支付导出的 CSV、XLSX 或 XLS 账单");
}
