"use client";

import { create } from "zustand";
import { markDuplicates } from "@/lib/dedupe";
import type { Transaction } from "@/lib/types";

type ImportState = {
  transactions: Transaction[];
  setTransactions: (transactions: Transaction[]) => void;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  removeTransaction: (id: string) => void;
  selectAll: (selected: boolean) => void;
  clear: () => void;
};

export const useImportStore = create<ImportState>((set) => ({
  transactions: [],
  setTransactions: (transactions) => set({ transactions: markDuplicates(transactions) }),
  updateTransaction: (id, patch) =>
    set((state) => ({
      transactions: markDuplicates(
        state.transactions.map((transaction) =>
          transaction.id === id ? { ...transaction, ...patch } : transaction
        )
      )
    })),
  removeTransaction: (id) =>
    set((state) => ({ transactions: markDuplicates(state.transactions.filter((item) => item.id !== id)) })),
  selectAll: (selected) =>
    set((state) => ({ transactions: state.transactions.map((item) => ({ ...item, selected })) })),
  clear: () => set({ transactions: [] })
}));
