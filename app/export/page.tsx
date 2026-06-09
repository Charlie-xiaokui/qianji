"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/button";
import { generateQianjiCsv, toQianjiRows } from "@/lib/csv";
import { useImportStore } from "@/store/import-store";

export default function ExportPage() {
  const transactions = useImportStore((state) => state.transactions);
  const account2 = useImportStore((state) => state.account2);
  const [error, setError] = useState("");
  const selectedTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.selected),
    [transactions]
  );
  const rows = useMemo(() => toQianjiRows(transactions, { account2 }), [account2, transactions]);
  const csvPreview = useMemo(
    () => generateQianjiCsv(transactions, { account2 }).replace(/^\uFEFF/, ""),
    [account2, transactions]
  );
  const exportPayload = useMemo(() => JSON.stringify(selectedTransactions), [selectedTransactions]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    setError("");
    if (!rows.length) {
      event.preventDefault();
      setError("没有可导出的记录");
    }
  }

  return (
    <AppShell description="生成符合钱迹导入格式的 CSV 文件" title="导出 CSV">
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="rounded-md border bg-card p-4">
          <p className="text-sm text-muted-foreground">已选记录</p>
          <p className="mt-2 text-3xl font-semibold">{rows.length}</p>
          <p className="mt-2 text-sm text-muted-foreground">账户2：{account2 || "未选择"}</p>
          <form action="/api/export-csv" className="mt-4 flex flex-wrap gap-2" method="post" onSubmit={handleSubmit}>
            <input name="account2" type="hidden" value={account2} />
            <input name="transactions" type="hidden" value={exportPayload} />
            <Button disabled={!rows.length} type="submit">
              下载 CSV
            </Button>
            <Link className="inline-flex" href="/review">
              <Button type="button" variant="secondary">
                返回审核
              </Button>
            </Link>
          </form>
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
