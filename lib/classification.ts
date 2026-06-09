"use client";

import { classifyWithCache } from "@/lib/category-cache";
import type { CategoryResult, ExtractedTransaction, Transaction } from "@/lib/types";

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function makeTransactionId(index: number) {
  return `${index}-${makeId()}`;
}

export function transactionFromExtracted(record: ExtractedTransaction, index: number, sourceFile?: string): Transaction {
  return {
    id: makeTransactionId(index),
    ...record,
    category: "其它",
    subcategory: "其它",
    selected: true,
    sourceFile
  };
}

export async function classifyTransactionsWithCache(transactions: Transaction[]) {
  const classified: Transaction[] = [];

  for (const transaction of transactions) {
    const fallback: CategoryResult | undefined =
      transaction.category && transaction.subcategory
        ? { category: transaction.category, subcategory: transaction.subcategory }
        : undefined;
    const category = await classifyWithCache(transaction.merchant, fallback);

    classified.push({
      ...transaction,
      category: category.category,
      subcategory: category.subcategory
    });
  }

  return classified;
}
