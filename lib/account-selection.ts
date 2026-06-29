import type { Transaction } from "@/lib/types";

const daiAccount = "戴冠宇账户";

const babyKeywords = [
  "宝宝",
  "婴儿",
  "儿童",
  "新生儿",
  "幼儿",
  "童装",
  "宝宝衣",
  "婴儿衣",
  "儿童衣",
  "儿童服",
  "童鞋",
  "baby",
  "kids"
];

const adultClothingKeywords = ["服装", "衣服", "鞋", "裤", "t恤", "T恤", "裙", "帽", "服饰", "装扮"];

function includesAny(value: string, keywords: string[]) {
  const normalized = value.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

function isBabyClothing(transaction: Transaction) {
  const text = `${transaction.merchant} ${transaction.category} ${transaction.subcategory}`;
  return includesAny(text, babyKeywords);
}

function shouldDeselectForDaiAccount(transaction: Transaction) {
  const text = `${transaction.merchant} ${transaction.category} ${transaction.subcategory}`;

  if (text.includes("余额宝") || text.includes("收益发放")) return true;
  if (text.includes("滴滴") || text.includes("打车")) return true;
  if (text.includes("公交") || text.includes("地铁")) return true;
  if (text.includes("停车") || transaction.subcategory === "停车费") return true;
  if (transaction.category === "餐饮" || transaction.category === "餐饮美食") return true;

  if (transaction.category === "服饰装扮" || transaction.category === "衣服" || includesAny(text, adultClothingKeywords)) {
    return !isBabyClothing(transaction);
  }

  return false;
}

export function applyAccountSelectionDefaults(account: string, transactions: Transaction[]) {
  if (account !== daiAccount) return transactions;

  return transactions.map((transaction) =>
    !transaction.selectionTouched && shouldDeselectForDaiAccount(transaction)
      ? { ...transaction, selected: false }
      : transaction
  );
}
