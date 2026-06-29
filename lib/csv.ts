import Papa from "papaparse";
import { normalizeCategoryResult } from "@/lib/category-rules";
import type { Transaction } from "@/lib/types";
import { formatAmount, platformLabel, toQianjiDate } from "@/lib/utils";

const csvColumns = ["时间", "分类", "二级分类", "类型", "金额", "账户1", "账户2", "备注"];

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

function qianjiSubcategory(category: string, subcategory: string) {
  if (category !== "其它" && subcategory.trim() === "其它") {
    return category;
  }

  return subcategory;
}

function qianjiNote(transaction: Transaction) {
  const note = transaction.note?.trim();
  const content = note ? `${transaction.merchant}（${note}）` : transaction.merchant;
  return `${content}（${platformLabel(transaction.platform)}）`;
}

export function toQianjiRows(transactions: Transaction[], options: CsvOptions = {}) {
  return transactions
    .filter((transaction) => transaction.selected)
    .map((transaction) => {
      const category = normalizeCategoryResult(
        { category: transaction.category, subcategory: transaction.subcategory },
        transaction.merchant
      );

      return {
        "时间": toQianjiDate(transaction.datetime),
        "分类": qianjiPrimaryType(transaction.type),
        "二级分类": qianjiSubcategory(category.category, category.subcategory),
        "类型": qianjiType(transaction.type),
        "金额": formatAmount(transaction.amount),
        "账户1": options.account2 ?? "",
        "账户2": "",
        "备注": qianjiNote(transaction)
      };
    });
}

export function generateQianjiCsv(transactions: Transaction[], options: CsvOptions = {}) {
  const rows = toQianjiRows(transactions, options);
  const csv = Papa.unparse(rows, { columns: csvColumns, newline: "\r\n" });
  return `\uFEFF${csv}`;
}
