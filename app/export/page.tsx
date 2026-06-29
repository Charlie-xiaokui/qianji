"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/button";
import { generateQianjiCsv, toQianjiRows } from "@/lib/csv";
import { useImportStore } from "@/store/import-store";

export default function ExportPage() {
  const transactions = useImportStore((state) => state.transactions);
  const account2 = useImportStore((state) => state.account2);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const selectedTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.selected),
    [transactions]
  );
  const rows = useMemo(() => toQianjiRows(transactions, { account2 }), [account2, transactions]);
  const csvPreview = useMemo(
    () => generateQianjiCsv(transactions, { account2 }).replace(/^\uFEFF/, ""),
    [account2, transactions]
  );

  async function handleDownload() {
    try {
      setError("");
      setDownloading(true);

      if (!rows.length) {
        throw new Error("没有可导出的记录");
      }

      const response = await fetch("/api/export-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account2,
          transactions: selectedTransactions
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => undefined)) as { error?: string } | undefined;
        throw new Error(payload?.error || "CSV 下载失败");
      }

      const blob = await response.blob();
      const file = new File([blob], "qianji_import.csv", { type: "text/csv;charset=utf-8" });
      const shareData = {
        files: [file],
        title: "qianji_import.csv"
      };

      if (navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
        return;
      }

      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = "qianji_import.csv";
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setError("如果没有看到下载文件，请长按保存，或使用 Safari 下载 CSV。");
    } catch (nextError) {
      setError(
        nextError instanceof Error && nextError.name === "AbortError"
          ? "下载已取消"
          : "下载失败。请长按保存，或使用 Safari 下载 CSV。"
      );
    } finally {
      setDownloading(false);
    }
  }

  function validateDownload() {
    if (!rows.length) {
      setError("没有可导出的记录");
      return false;
    }

    return true;
  }

  return (
    <AppShell description="生成符合钱迹导入格式的 CSV 文件" title="导出 CSV">
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="rounded-md border bg-card p-4">
          <p className="text-sm text-muted-foreground">已选记录</p>
          <p className="mt-2 text-3xl font-semibold">{rows.length}</p>
          <p className="mt-2 text-sm text-muted-foreground">账户1：{account2 || "未选择"}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button disabled={!rows.length || downloading} onClick={() => validateDownload() && void handleDownload()}>
              {downloading ? "下载中" : "下载 CSV"}
            </Button>
            <Link className="inline-flex" href="/review">
              <Button type="button" variant="secondary">
                返回审核
              </Button>
            </Link>
          </div>
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        </div>
        <div className="overflow-hidden rounded-md border bg-card">
          <div className="border-b bg-muted px-4 py-3 text-sm font-medium">CSV 预览</div>
          <pre className="max-h-96 overflow-auto p-4 text-xs">
            {rows.length ? csvPreview : "暂无可导出的记录"}
          </pre>
        </div>
      </div>
    </AppShell>
  );
}
