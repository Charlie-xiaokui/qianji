import Papa from "papaparse";
import type { Transaction } from "@/lib/types";
import { formatAmount, platformLabel, toQianjiDate } from "@/lib/utils";

const csvColumns = ["时间", "分类", "二级分类", "类型", "金额", "账户1", "账户2", "备注"];

export function toQianjiRows(transactions: Transaction[]) {
  return transactions
    .filter((transaction) => transaction.selected)
    .map((transaction) => ({
      "时间": toQianjiDate(transaction.datetime),
      "分类": transaction.category,
      "二级分类": transaction.subcategory,
      "类型": transaction.type === "income" ? "收入" : "支出",
      "金额": formatAmount(transaction.amount),
      "账户1": "",
      "账户2": transaction.platform === "wechat" ? "微信账户" : "支付宝账户",
      "备注": transaction.note?.trim() || `${platformLabel(transaction.platform)}-${transaction.merchant}`
    }));
}

export function generateQianjiCsv(transactions: Transaction[]) {
  const rows = toQianjiRows(transactions);
  const csv = Papa.unparse(rows, { columns: csvColumns, newline: "\r\n" });
  return `\uFEFF${csv}`;
}

export function downloadCsv(transactions: Transaction[]) {
  const csv = generateQianjiCsv(transactions);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "qianji_import.csv";
  link.click();
  URL.revokeObjectURL(url);
}
