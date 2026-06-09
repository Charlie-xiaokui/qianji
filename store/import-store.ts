"use client";

import { create } from "zustand";
import { markDuplicates } from "@/lib/dedupe";
import type { Transaction } from "@/lib/types";

type ImportState = {
  transactions: Transaction[];
  account2: string;
  setTransactions: (transactions: Transaction[]) => void;
  setAccount2: (account2: string) => void;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  removeTransaction: (id: string) => void;
  selectAll: (selected: boolean) => void;
  clear: () => void;
};

export const useImportStore = create<ImportState>((set) => ({
  transactions: [],
  account2: "",
  setTransactions: (transactions) => set({ transactions: markDuplicates(transactions) }),
  setAccount2: (account2) => set({ account2 }),
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
  clear: () => set({ transactions: [], account2: "" })
}));
