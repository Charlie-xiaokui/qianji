"use client";

import Link from "next/link";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/button";
import { classifyWithCacheDetails, clearMerchantCategoryCache } from "@/lib/category-cache";
import { classifyTransactionsWithCache } from "@/lib/classification";
import { mockTransactions } from "@/lib/mock-data";
import { useImportStore } from "@/store/import-store";

const classifyTestMerchants = [
  "美团外卖",
  "饿了么",
  "肯德基宅急送"
];

type ClassifyTestResult = {
  merchant: string;
  first: string;
  second: string;
  category: string;
  subcategory: string;
};

export default function MockPage() {
  const setTransactions = useImportStore((state) => state.setTransactions);
  const clear = useImportStore((state) => state.clear);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<ClassifyTestResult[]>([]);
  const [testError, setTestError] = useState("");

  async function loadMockTransactions() {
    setTransactions(await classifyTransactionsWithCache(mockTransactions));
  }

  async function resetMockState() {
    clear();
    await clearMerchantCategoryCache();
  }

  async function verifyClassifyCache() {
    setTesting(true);
    setTestError("");
    setTestResults([]);

    try {
      await clearMerchantCategoryCache();
      const results: ClassifyTestResult[] = [];

      for (const merchant of classifyTestMerchants) {
        const first = await classifyWithCacheDetails(merchant);
        const second = await classifyWithCacheDetails(merchant);
        results.push({
          merchant,
          first: first.source,
          second: second.source,
          category: first.category,
          subcategory: first.subcategory
        });
      }

      setTestResults(results);
    } catch (error) {
      setTestError(error instanceof Error ? error.message : "分类验证失败");
    } finally {
      setTesting(false);
    }
  }

  return (
    <AppShell description="验证审核状态流、分类缓存和 MiniMax 分类" title="Mock 测试">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border bg-card p-5">
          <h2 className="text-lg font-semibold">载入测试账单</h2>
          <p className="mt-2 text-sm text-muted-foreground">包含微信、支付宝、收入和一条疑似重复记录。</p>
          <div className="mt-5 flex gap-2">
            <Button onClick={loadMockTransactions}>载入 Mock</Button>
            <Button onClick={resetMockState} variant="secondary">
              清空缓存
            </Button>
          </div>
          <Link className="mt-4 inline-flex" href="/review">
            <Button variant="ghost">去审核</Button>
          </Link>
        </div>
        <div className="rounded-md border bg-card p-5">
          <h2 className="text-lg font-semibold">分类缓存验证</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            清空 IndexedDB 后连续分类两次，第二次应显示 cache。
          </p>
          <div className="mt-5">
            <Button disabled={testing} onClick={verifyClassifyCache}>
              {testing ? "验证中" : "验证 MiniMax 分类"}
            </Button>
          </div>
          {testError ? <p className="mt-3 text-sm text-destructive">{testError}</p> : null}
          {testResults.length ? (
            <div className="mt-4 overflow-hidden rounded-md border">
              {testResults.map((result) => (
                <div className="grid grid-cols-[1fr_76px_76px] gap-2 border-b px-3 py-2 text-sm last:border-b-0" key={result.merchant}>
                  <div>
                    <p className="font-medium">{result.merchant}</p>
                    <p className="text-xs text-muted-foreground">
                      {result.category} / {result.subcategory}
                    </p>
                  </div>
                  <span className="self-center rounded bg-muted px-2 py-1 text-center text-xs">{result.first}</span>
                  <span className="self-center rounded bg-muted px-2 py-1 text-center text-xs">{result.second}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
