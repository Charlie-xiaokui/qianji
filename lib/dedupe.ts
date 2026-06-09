import type { Transaction } from "@/lib/types";
import { formatAmount, normalizeDatetime } from "@/lib/utils";

export function transactionKey(transaction: Pick<Transaction, "merchant" | "amount" | "datetime">) {
  const minute = normalizeDatetime(transaction.datetime).slice(0, 16).replace(" ", "T");
  return `${transaction.merchant.trim()}_${formatAmount(transaction.amount)}_${minute}`;
}

export function markDuplicates(transactions: Transaction[]) {
  const seen = new Set<string>();

  return transactions.map((transaction) => {
    const key = transactionKey(transaction);
    const possibleDuplicate = seen.has(key);
    seen.add(key);
    return {
      ...transaction,
      possibleDuplicate,
      selected: transaction.selected ?? true
    };
  });
}
