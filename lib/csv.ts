import Papa from "papaparse";
import type { Transaction } from "@/lib/types";
import { formatAmount, platformLabel, toQianjiDate } from "@/lib/utils";

const csvColumns = ["时间", "分类", "二级分类", "类型", "金额", "账户1", "账户2", "备注"];
const fallbackSubcategories = new Set(["", "其它", "其他", "其它等", "其他等"]);

type CsvOptions = {
  account2?: string;
};

function qianjiPrimaryType(type: Transaction["type"]) {
  if (type === "income") return "收入";
  if (type === "transfer") return "转账";
  return "支出";
}

function qianjiType(type: Transaction["type"]) {
  return type === "income" ? "收入" : "支出";
}

function qianjiSubcategory(transaction: Transaction) {
  const subcategory = transaction.subcategory.trim();
  return fallbackSubcategories.has(subcategory) ? transaction.category : subcategory;
}

export function toQianjiRows(transactions: Transaction[], options: CsvOptions = {}) {
  return transactions
    .filter((transaction) => transaction.selected)
    .map((transaction) => ({
      "时间": toQianjiDate(transaction.datetime),
      "分类": qianjiPrimaryType(transaction.type),
      "二级分类": qianjiSubcategory(transaction),
      "类型": qianjiType(transaction.type),
      "金额": formatAmount(transaction.amount),
      "账户1": "",
      "账户2": options.account2 ?? "",
      "备注": transaction.note?.trim() || `${platformLabel(transaction.platform)}-${transaction.merchant}`
    }));
}

export function generateQianjiCsv(transactions: Transaction[], options: CsvOptions = {}) {
  const rows = toQianjiRows(transactions, options);
  const csv = Papa.unparse(rows, { columns: csvColumns, newline: "\r\n" });
  return `\uFEFF${csv}`;
}
