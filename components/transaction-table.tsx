"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/button";
import { normalizeCategoryResult } from "@/lib/category-rules";
import { CATEGORY_OPTIONS } from "@/lib/types";
import type { Transaction } from "@/lib/types";
import { formatAmount, platformLabel } from "@/lib/utils";
import { useImportStore } from "@/store/import-store";

function isValidAmount(value: string) {
  const normalized = value.trim();
  if (!normalized) return false;
  if (!/^\d+(\.\d*)?$/.test(normalized)) return false;
  return Number.isFinite(Number(normalized));
}

function signedAmount(transaction: Transaction) {
  const sign = transaction.type === "income" ? "" : "-";
  return `${sign}${formatAmount(transaction.amount)}`;
}

function categoryText(category: string, subcategory: string) {
  return subcategory === "其它" ? category : `${category} / ${subcategory}`;
}

function sourceText(transaction: Transaction) {
  return `${transaction.datetime} · ${platformLabel(transaction.platform)}`;
}

export function TransactionTable() {
  const { transactions, updateTransaction, selectAll } = useImportStore();
  const [editingMerchantId, setEditingMerchantId] = useState<string>();
  const [editingAmountId, setEditingAmountId] = useState<string>();
  const [amountDrafts, setAmountDrafts] = useState<Record<string, string>>({});
  const [amountErrors, setAmountErrors] = useState<Record<string, string>>({});
  const [pickerTransactionId, setPickerTransactionId] = useState<string>();
  const [pickerCategory, setPickerCategory] = useState<string>();

  useEffect(() => {
    transactions.forEach((transaction) => {
      const normalized = normalizeCategoryResult(
        { category: transaction.category, subcategory: transaction.subcategory },
        transaction.merchant
      );

      if (normalized.category !== transaction.category || normalized.subcategory !== transaction.subcategory) {
        updateTransaction(transaction.id, normalized);
      }
    });
  }, [transactions, updateTransaction]);

  const pickerTransaction = transactions.find((transaction) => transaction.id === pickerTransactionId);
  const pickerNormalized = pickerTransaction
    ? normalizeCategoryResult(
        { category: pickerTransaction.category, subcategory: pickerTransaction.subcategory },
        pickerTransaction.merchant
      )
    : undefined;
  const activePickerCategory = pickerCategory ?? pickerNormalized?.category ?? "其它";
  const activeSubcategories = CATEGORY_OPTIONS[activePickerCategory] ?? ["其它"];

  function startAmountEdit(transaction: Transaction) {
    setEditingAmountId(transaction.id);
    setAmountDrafts((drafts) => ({
      ...drafts,
      [transaction.id]: drafts[transaction.id] ?? formatAmount(transaction.amount)
    }));
  }

  function updateAmount(transaction: Transaction, value: string) {
    setAmountDrafts((drafts) => ({ ...drafts, [transaction.id]: value }));

    if (isValidAmount(value)) {
      updateTransaction(transaction.id, { amount: Number(value) });
      setAmountErrors((errors) => ({ ...errors, [transaction.id]: "" }));
    } else {
      updateTransaction(transaction.id, { amount: 0 });
    }
  }

  function finishAmountEdit(transaction: Transaction) {
    const value = amountDrafts[transaction.id] ?? "";
    if (!isValidAmount(value)) {
      setAmountErrors((errors) => ({ ...errors, [transaction.id]: "金额为空或格式不正确，导出时将按 0.00 处理" }));
      return;
    }

    setAmountDrafts((drafts) => ({ ...drafts, [transaction.id]: formatAmount(Number(value)) }));
    setAmountErrors((errors) => ({ ...errors, [transaction.id]: "" }));
    setEditingAmountId(undefined);
  }

  function openCategoryPicker(transaction: Transaction) {
    const normalized = normalizeCategoryResult(
      { category: transaction.category, subcategory: transaction.subcategory },
      transaction.merchant
    );
    setPickerTransactionId(transaction.id);
    setPickerCategory(normalized.category);
  }

  function chooseSubcategory(subcategory: string) {
    if (!pickerTransactionId) return;
    updateTransaction(pickerTransactionId, {
      category: activePickerCategory,
      subcategory
    });
    setPickerTransactionId(undefined);
    setPickerCategory(undefined);
  }

  if (!transactions.length) {
    return (
      <div className="rounded-md border bg-card p-6 text-center text-sm text-muted-foreground">
        暂无记录。可以从 Mock 页面载入测试数据。
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button onClick={() => selectAll(true)} variant="secondary">
          全选
        </Button>
        <Button onClick={() => selectAll(false)} variant="secondary">
          取消全选
        </Button>
      </div>

      <div className="-mx-4 overflow-hidden border-y bg-card sm:mx-0 sm:rounded-md sm:border">
        {transactions.map((transaction) => {
          const normalized = normalizeCategoryResult(
            { category: transaction.category, subcategory: transaction.subcategory },
            transaction.merchant
          );
          const isEditingMerchant = editingMerchantId === transaction.id;
          const isEditingAmount = editingAmountId === transaction.id;
          const amountDraft = amountDrafts[transaction.id] ?? formatAmount(transaction.amount);
          const amountError = amountErrors[transaction.id];

          return (
            <div className="border-b px-2 py-3 last:border-b-0 sm:px-3 sm:py-4" key={transaction.id}>
              <div className="grid grid-cols-[34px_minmax(0,1fr)_74px] gap-1.5 sm:grid-cols-[38px_minmax(0,1fr)_90px] sm:gap-2">
                <input
                  checked={transaction.selected}
                  className="mt-1 size-6 justify-self-center"
                  onChange={(event) => updateTransaction(transaction.id, { selected: event.target.checked })}
                  type="checkbox"
                />

                <div className="min-w-0">
                  {isEditingMerchant ? (
                    <input
                      autoFocus
                      className="w-full min-w-0 rounded border bg-background px-2 py-1 text-base font-medium"
                      onBlur={() => setEditingMerchantId(undefined)}
                      onChange={(event) => updateTransaction(transaction.id, { merchant: event.target.value })}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.blur();
                      }}
                      value={transaction.merchant}
                    />
                  ) : (
                    <button
                      className="merchant-two-line block w-full text-left text-base font-medium leading-snug"
                      onClick={() => setEditingMerchantId(transaction.id)}
                      type="button"
                    >
                      {transaction.merchant}
                    </button>
                  )}

                  <button
                    className="mt-1 block w-full truncate text-left text-sm text-muted-foreground"
                    onClick={() => openCategoryPicker(transaction)}
                    type="button"
                  >
                    {categoryText(normalized.category, normalized.subcategory)}
                  </button>

                  <p className="mt-1 break-words text-sm leading-snug text-muted-foreground">
                    {sourceText(transaction)}
                  </p>
                  {transaction.possibleDuplicate ? (
                    <span className="mt-2 inline-flex rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-900">
                      疑似重复
                    </span>
                  ) : null}
                </div>

                <div className="min-w-0 text-right">
                  {isEditingAmount ? (
                    <input
                      autoFocus
                      className="w-24 rounded border bg-background px-2 py-1 text-right text-base font-semibold"
                      inputMode="decimal"
                      onBlur={() => finishAmountEdit(transaction)}
                      onChange={(event) => updateAmount(transaction, event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.blur();
                      }}
                      type="text"
                      value={amountDraft}
                    />
                  ) : (
                    <button
                      className="max-w-full break-words text-right text-lg font-semibold leading-snug"
                      onClick={() => startAmountEdit(transaction)}
                      type="button"
                    >
                      {signedAmount(transaction)}
                    </button>
                  )}
                </div>
              </div>
              {amountError ? <p className="mt-2 pl-[54px] text-sm text-destructive">{amountError}</p> : null}
            </div>
          );
        })}
      </div>

      {pickerTransaction ? (
        <div className="fixed inset-0 z-50 flex items-end bg-foreground/40">
          <div className="w-full rounded-t-md bg-card p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">选择分类</h2>
              <Button
                onClick={() => {
                  setPickerTransactionId(undefined);
                  setPickerCategory(undefined);
                }}
                type="button"
                variant="ghost"
              >
                取消
              </Button>
            </div>
            <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-hidden">
              <div className="overflow-auto rounded-md border">
                {Object.keys(CATEGORY_OPTIONS).map((category) => (
                  <button
                    className={`block w-full border-b px-3 py-2 text-left text-sm last:border-b-0 ${
                      activePickerCategory === category ? "bg-muted font-semibold" : ""
                    }`}
                    key={category}
                    onClick={() => setPickerCategory(category)}
                    type="button"
                  >
                    {category}
                  </button>
                ))}
              </div>
              <div className="overflow-auto rounded-md border">
                {activeSubcategories.map((subcategory) => (
                  <button
                    className="block w-full border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted"
                    key={subcategory}
                    onClick={() => chooseSubcategory(subcategory)}
                    type="button"
                  >
                    {subcategory}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
