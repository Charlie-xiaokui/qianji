import type { Transaction } from "@/lib/types";
import { getDefaultSelection, isYuEBaoFee } from "@/lib/category-rules";

export { isYuEBaoFee };

export function applyAccountSelectionDefaults(account: string, transactions: Transaction[]) {
  return transactions.map((transaction) =>
    transaction.selectionTouched ? transaction : { ...transaction, selected: getDefaultSelection(transaction, account).selected }
  );
}
