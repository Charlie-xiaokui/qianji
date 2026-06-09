"use client";

import { Trash2 } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/button";
import { getDefaultSubcategory, normalizeCategoryResult } from "@/lib/category-rules";
import { CATEGORY_OPTIONS } from "@/lib/types";
import { formatAmount, platformLabel } from "@/lib/utils";
import { useImportStore } from "@/store/import-store";

export function TransactionTable() {
  const { transactions, updateTransaction, removeTransaction, selectAll } = useImportStore();

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
      <div className="overflow-hidden rounded-md border bg-card">
        <div className="hidden grid-cols-[44px_160px_1fr_110px_120px_120px_90px_48px] border-b bg-muted px-3 py-2 text-sm font-medium text-muted-foreground md:grid">
          <span />
          <span>时间</span>
          <span>商户</span>
          <span>金额</span>
          <span>分类</span>
          <span>二级分类</span>
          <span>来源</span>
          <span />
        </div>
        {transactions.map((transaction) => {
          const normalized = normalizeCategoryResult(
            { category: transaction.category, subcategory: transaction.subcategory },
            transaction.merchant
          );
          const subcategories = CATEGORY_OPTIONS[normalized.category] ?? ["其它"];

          return (
            <div
              className="grid gap-3 border-b px-3 py-3 last:border-b-0 md:grid-cols-[44px_160px_1fr_110px_120px_120px_90px_48px] md:items-center"
              key={transaction.id}
            >
            <input
              checked={transaction.selected}
              className="size-5"
              onChange={(event) => updateTransaction(transaction.id, { selected: event.target.checked })}
              type="checkbox"
            />
            <input
              className="min-w-0 rounded border bg-background px-2 py-2 text-sm"
              onChange={(event) => updateTransaction(transaction.id, { datetime: event.target.value })}
              value={transaction.datetime}
            />
            <div>
              <input
                className="w-full min-w-0 rounded border bg-background px-2 py-2 text-sm"
                onChange={(event) => updateTransaction(transaction.id, { merchant: event.target.value })}
                value={transaction.merchant}
              />
              {transaction.possibleDuplicate ? (
                <span className="mt-1 inline-flex rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-900">
                  疑似重复
                </span>
              ) : null}
            </div>
            <input
              className="min-w-0 rounded border bg-background px-2 py-2 text-sm"
              onChange={(event) => updateTransaction(transaction.id, { amount: Number(event.target.value) })}
              type="number"
              value={formatAmount(transaction.amount)}
            />
            <select
              className="rounded border bg-background px-2 py-2 text-sm"
              onChange={(event) => {
                const category = event.target.value;
                updateTransaction(transaction.id, {
                  category,
                  subcategory: getDefaultSubcategory(category)
                });
              }}
              value={normalized.category}
            >
              {Object.keys(CATEGORY_OPTIONS).map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
            <select
              className="rounded border bg-background px-2 py-2 text-sm"
              onChange={(event) => updateTransaction(transaction.id, { subcategory: event.target.value })}
              value={normalized.subcategory}
            >
              {subcategories.map((subcategory) => (
                <option key={subcategory}>{subcategory}</option>
              ))}
            </select>
            <span className="text-sm text-muted-foreground">{platformLabel(transaction.platform)}</span>
            <Button
              aria-label="删除记录"
              className="size-10 px-0"
              onClick={() => removeTransaction(transaction.id)}
              variant="ghost"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
          );
        })}
      </div>
    </div>
  );
}
