import { normalizeCategoryResult } from "@/lib/category-rules";
import { cleanCell, decodeCsvBuffer, extractTableByHeader, includesAny, parseAmount, parseCsvTable, parseDate } from "@/lib/importers/csv";
import type { CsvRow } from "@/lib/importers/types";
import type { ExtractedTransaction, TransactionType } from "@/lib/types";

const alipayHeaderPrefix = "交易时间,交易分类,交易对方";
const alipayMarkers = [alipayHeaderPrefix, "支付宝交易明细", "收/付款方式,交易状态"];

export function isAlipayCsvContent(content: string) {
  return content.includes(alipayHeaderPrefix) && content.includes("商品说明") && content.includes("收/支");
}

function extractAlipayTable(content: string) {
  const table = extractTableByHeader(content, [(line) => line.includes(alipayHeaderPrefix)]);
  if (!table) {
    throw new Error("支付宝账单格式不受支持：未找到交易明细表头");
  }
  return table;
}

function getType(row: CsvRow, amount: number): TransactionType | undefined {
  const direction = cleanCell(row["收/支"]);
  const category = cleanCell(row["交易分类"]);
  const description = cleanCell(row["商品说明"]);

  if (amount <= 0) return undefined;
  if (direction === "支出") return "expense";
  if (direction === "收入") return "income";

  if (direction === "不计收支") {
    if (includesAny(`${category} ${description}`, ["余额宝", "收益发放"])) return "income";
    if (category === "退款" || description.startsWith("退款-")) return "income";
  }

  return undefined;
}

function buildNote(counterparty: string, description: string) {
  return description ? `支付宝-${counterparty}-${description}` : `支付宝-${counterparty}`;
}

export function parseAlipayCsvContent(content: string): ExtractedTransaction[] {
  const table = extractAlipayTable(content);
  const { rows } = parseCsvTable(table);
  const invalidAmountRows: string[] = [];

  const transactions = rows.flatMap((row) => {
    const date = parseDate(row["交易时间"]);
    const alipayCategory = cleanCell(row["交易分类"]);
    const counterparty = cleanCell(row["交易对方"]);
    const description = cleanCell(row["商品说明"]);
    const paymentMethod = cleanCell(row["收/付款方式"]);
    const status = cleanCell(row["交易状态"]);
    const sourceId = cleanCell(row["交易订单号"]) || cleanCell(row["商家订单号"]);
    const rawAmount = cleanCell(row["金额"]);
    const amount = parseAmount(rawAmount);

    if (rawAmount && amount === undefined) {
      invalidAmountRows.push(`${date || "未知时间"} ${description || counterparty || "未知交易"}`);
      return [];
    }

    if (amount === undefined) return [];

    const type = getType(row, amount);
    if (!date || !counterparty || !type) return [];

    const category = normalizeCategoryResult(undefined, `${alipayCategory} ${description} ${counterparty}`);
    const transaction: ExtractedTransaction = {
      platform: "alipay",
      merchant: description || counterparty,
      amount,
      datetime: date,
      type,
      category: category.category,
      subcategory: category.subcategory,
      note: buildNote(counterparty, description),
      sourceId,
      rawCategory: alipayCategory,
      paymentMethod,
      status,
      source: "alipay",
      description,
      counterparty,
      originalCategory: alipayCategory,
      alipayTitle: description,
      alipayCounterparty: counterparty
    };

    return [transaction];
  });

  if (invalidAmountRows.length) {
    throw new Error(`支付宝账单存在无法解析的金额：${invalidAmountRows.slice(0, 3).join("；")}`);
  }

  return transactions;
}

export function decodeAlipayCsv(buffer: ArrayBuffer) {
  return decodeCsvBuffer(buffer, alipayMarkers);
}

export function parseAlipayCsv(buffer: ArrayBuffer): ExtractedTransaction[] {
  return parseAlipayCsvContent(decodeAlipayCsv(buffer));
}
