import { normalizeCategoryResult } from "@/lib/category-rules";
import {
  cleanCell,
  decodeCsvBuffer,
  extractTableByHeader,
  includesAny,
  normalizeHeader,
  parseAmount,
  parseCsvTable,
  parseDate
} from "@/lib/importers/csv";
import type { CsvRow } from "@/lib/importers/types";
import type { ExtractedTransaction, TransactionType } from "@/lib/types";

const wechatMarkers = ["微信支付账单", "微信支付账单明细", "交易时间", "交易类型", "交易对方", "金额(元)", "金额（元）"];

const fieldAliases = {
  date: ["交易时间", "支付时间", "入账时间"],
  transactionType: ["交易类型", "业务类型"],
  counterparty: ["交易对方", "交易对象", "收付款方", "收/付款方"],
  product: ["商品", "商品说明", "商品名称", "交易说明"],
  direction: ["收/支", "收支", "收入/支出"],
  amount: ["金额(元)", "金额（元）", "交易金额(元)", "交易金额（元）", "交易金额", "金额"],
  paymentMethod: ["支付方式", "收/付款方式", "付款方式"],
  status: ["当前状态", "交易状态", "状态"],
  transactionId: ["交易单号", "微信订单号", "微信支付单号"],
  merchantId: ["商户单号", "商户订单号"],
  remark: ["备注", "交易备注"]
} as const;

function rowValue(row: CsvRow, aliases: readonly string[]) {
  const aliasSet = new Set(aliases.map(normalizeHeader));
  const entry = Object.entries(row).find(([header]) => aliasSet.has(normalizeHeader(header)));
  return cleanCell(entry?.[1]);
}

function lineHasHeaders(line: string) {
  const normalized = normalizeHeader(line);
  const hasDate = fieldAliases.date.some((header) => normalized.includes(normalizeHeader(header)));
  const hasAmount = fieldAliases.amount.some((header) => normalized.includes(normalizeHeader(header)));
  const supportingFields = [fieldAliases.transactionType, fieldAliases.counterparty, fieldAliases.direction, fieldAliases.status].filter(
    (aliases) => aliases.some((header) => normalized.includes(normalizeHeader(header)))
  ).length;
  return hasDate && hasAmount && supportingFields >= 2;
}

export function isWechatCsvContent(content: string) {
  return content.split(/\r?\n/).some(lineHasHeaders);
}

function extractWechatTable(content: string) {
  const table = extractTableByHeader(content, [lineHasHeaders]);
  if (!table) {
    throw new Error("微信账单格式不受支持：未找到交易明细表头");
  }
  return table;
}

function getType(row: CsvRow, amount: number): TransactionType | undefined {
  const direction = rowValue(row, fieldAliases.direction);
  const transactionType = rowValue(row, fieldAliases.transactionType);
  const product = rowValue(row, fieldAliases.product);
  const status = rowValue(row, fieldAliases.status);
  const text = `${transactionType} ${product}`;

  if (amount <= 0) return undefined;
  if (direction === "支出") return "expense";
  if (direction === "收入") return "income";
  if (includesAny(`${text} ${status}`, ["退款收入", "退款到账", "退款成功"])) return "income";
  return undefined;
}

function isInvalidStatus(status: string) {
  return includesAny(status, ["已关闭", "已取消", "交易关闭", "支付失败", "已撤销"]);
}

function buildMerchant(counterparty: string, product: string, transactionType: string) {
  return product || counterparty || transactionType;
}

function buildNote(counterparty: string, product: string, paymentMethod: string, status: string) {
  const parts = [counterparty, product, paymentMethod, status].filter(Boolean);
  return `微信-${parts.join("-")}`;
}

export function parseWechatCsvContent(content: string): ExtractedTransaction[] {
  const table = extractWechatTable(content);
  const { rows } = parseCsvTable(table);
  const invalidAmountRows: string[] = [];

  const transactions = rows.flatMap((row) => {
    const date = parseDate(rowValue(row, fieldAliases.date));
    const transactionType = rowValue(row, fieldAliases.transactionType);
    const counterparty = rowValue(row, fieldAliases.counterparty);
    const product = rowValue(row, fieldAliases.product);
    const paymentMethod = rowValue(row, fieldAliases.paymentMethod);
    const status = rowValue(row, fieldAliases.status);
    const sourceId = rowValue(row, fieldAliases.transactionId) || rowValue(row, fieldAliases.merchantId);
    const rawAmount = rowValue(row, fieldAliases.amount);
    const remark = rowValue(row, fieldAliases.remark);

    if (isInvalidStatus(status)) return [];

    const amount = parseAmount(rawAmount);
    if (rawAmount && amount === undefined) {
      invalidAmountRows.push(`${date || "未知时间"} ${product || counterparty || "未知交易"}`);
      return [];
    }

    if (amount === undefined) return [];

    const type = getType(row, amount);
    const merchant = buildMerchant(counterparty, product, transactionType);
    if (!date || !merchant || !type) return [];

    const category = normalizeCategoryResult(undefined, `${transactionType} ${counterparty} ${product}`);
    const transaction: ExtractedTransaction = {
      platform: "wechat",
      merchant,
      amount,
      datetime: date,
      type,
      category: category.category,
      subcategory: category.subcategory,
      note: buildNote(counterparty, product || remark, paymentMethod, status),
      sourceId,
      rawCategory: transactionType,
      paymentMethod,
      status,
      source: "wechat",
      description: product,
      remark,
      counterparty,
      originalCategory: transactionType,
      wechatProduct: product,
      wechatCounterparty: counterparty
    };

    return [transaction];
  });

  if (invalidAmountRows.length) {
    throw new Error(`微信账单存在无法解析的金额：${invalidAmountRows.slice(0, 3).join("；")}`);
  }

  return transactions;
}

export function decodeWechatCsv(buffer: ArrayBuffer) {
  return decodeCsvBuffer(buffer, wechatMarkers);
}

export function parseWechatCsv(buffer: ArrayBuffer): ExtractedTransaction[] {
  return parseWechatCsvContent(decodeWechatCsv(buffer));
}
