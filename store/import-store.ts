"use client";

import { create } from "zustand";
import { applyAccountSelectionDefaults } from "@/lib/account-selection";
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
  invertSelection: () => void;
  clear: () => void;
};

export const useImportStore = create<ImportState>((set) => ({
  transactions: [],
  account2: "",
  setTransactions: (transactions) =>
    set((state) => ({ transactions: markDuplicates(applyAccountSelectionDefaults(state.account2, transactions)) })),
  setAccount2: (account2) =>
    set((state) => ({
      account2,
      transactions: markDuplicates(applyAccountSelectionDefaults(account2, state.transactions))
    })),
  updateTransaction: (id, patch) =>
    set((state) => ({
      transactions: markDuplicates(
        state.transactions.map((transaction) =>
          transaction.id === id
            ? { ...transaction, ...patch, selectionTouched: "selected" in patch ? true : transaction.selectionTouched }
            : transaction
        )
      )
    })),
  removeTransaction: (id) =>
    set((state) => ({ transactions: markDuplicates(state.transactions.filter((item) => item.id !== id)) })),
  selectAll: (selected) =>
    set((state) => ({
      transactions: state.transactions.map((item) => ({ ...item, selected, selectionTouched: true }))
    })),
  invertSelection: () =>
    set((state) => ({
      transactions: state.transactions.map((item) => ({
        ...item,
        selected: !item.selected,
        selectionTouched: true
      }))
    })),
  clear: () => set({ transactions: [], account2: "" })
}));
