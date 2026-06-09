"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/button";
import { downloadCsv, generateQianjiCsv, toQianjiRows } from "@/lib/csv";
import { useImportStore } from "@/store/import-store";

export default function ExportPage() {
  const transactions = useImportStore((state) => state.transactions);
  const [error, setError] = useState("");
  const rows = toQianjiRows(transactions);
  const csvPreview = useMemo(() => generateQianjiCsv(transactions).replace(/^\uFEFF/, ""), [transactions]);

  function handleDownload() {
    try {
      setError("");
      if (!rows.length) {
        throw new Error("没有可导出的记录");
      }
      downloadCsv(transactions);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "CSV 下载失败");
    }
  }

  return (
    <AppShell description="生成符合钱迹导入格式的 CSV 文件" title="导出 CSV">
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="rounded-md border bg-card p-4">
          <p className="text-sm text-muted-foreground">已选记录</p>
          <p className="mt-2 text-3xl font-semibold">{rows.length}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button disabled={!rows.length} onClick={handleDownload}>
              下载 CSV
            </Button>
            <Link className="inline-flex" href="/review">
              <Button variant="secondary">返回审核</Button>
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
