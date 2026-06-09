"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/button";
import { classifyTransactionsWithCache, transactionFromExtracted } from "@/lib/classification";
import { filesToOcrFormData } from "@/lib/image";
import type { ExtractedTransaction, OcrTransaction } from "@/lib/types";
import { useImportStore } from "@/store/import-store";

export function UploadZone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const setTransactions = useImportStore((state) => state.setTransactions);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "recognizing" | "classifying">("idle");

  function acceptFiles(nextFiles: File[]) {
    try {
      filesToOcrFormData(nextFiles);
      setFiles(nextFiles);
      setError("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "图片读取失败");
    }
  }

  async function recognizeFiles() {
    try {
      setError("");
      setStatus("recognizing");
      const response = await fetch("/api/ocr", {
        method: "POST",
        body: filesToOcrFormData(files)
      });
      const payload = (await response.json()) as {
        transactions?: OcrTransaction[];
        error?: string;
        warnings?: string[];
      };

      if (!response.ok || !payload.transactions?.length) {
        throw new Error(payload.error || payload.warnings?.[0] || "未识别到账单，请重新上传");
      }

      setStatus("classifying");
      const transactions = payload.transactions.map((record, index) => {
        const extracted: ExtractedTransaction = {
          platform: record.account.includes("支付宝") ? "alipay" : "wechat",
          merchant: record.merchant,
          amount: record.amount,
          datetime: record.date,
          type: record.type
        };
        return transactionFromExtracted(extracted, index);
      });
      setTransactions(await classifyTransactionsWithCache(transactions));
      router.push("/review");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "识别失败");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div
      className="flex min-h-72 flex-col items-center justify-center rounded-md border border-dashed bg-card px-5 py-8 text-center"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        acceptFiles(Array.from(event.dataTransfer.files));
      }}
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-md bg-muted">
        <Upload className="size-6" />
      </div>
      <h2 className="text-lg font-semibold">上传支付宝或微信账单截图</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">支持 jpg、jpeg、png、webp，多张截图会以 FormData 上传。</p>
      <input
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        multiple
        onChange={(event) => acceptFiles(Array.from(event.target.files ?? []))}
        ref={inputRef}
        type="file"
      />
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button onClick={() => inputRef.current?.click()}>选择截图</Button>
        <Button disabled={!files.length || status !== "idle"} onClick={recognizeFiles} variant="secondary">
          {status === "recognizing" ? "识别中" : status === "classifying" ? "分类中" : "开始识别"}
        </Button>
      </div>
      {files.length ? <p className="mt-4 text-sm text-muted-foreground">已选择 {files.length} 张截图</p> : null}
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
