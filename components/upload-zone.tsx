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
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const setTransactions = useImportStore((state) => state.setTransactions);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [showUploadPicker, setShowUploadPicker] = useState(false);
  const [status, setStatus] = useState<"idle" | "recognizing" | "classifying" | "parsing">("idle");

  function isCsvFile(file: File) {
    return file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv";
  }

  function selectedCsvFile() {
    return files.length === 1 && isCsvFile(files[0]) ? files[0] : undefined;
  }

  function acceptFiles(nextFiles: File[]) {
    if (!nextFiles.length) return;

    try {
      const csvFiles = nextFiles.filter(isCsvFile);
      if (csvFiles.length) {
        if (nextFiles.length > 1) {
          throw new Error("支付宝 CSV 请单独上传，不要和截图混选");
        }
        setFiles(csvFiles);
        setError("");
        return;
      }

      filesToOcrFormData(nextFiles);
      setFiles(nextFiles);
      setError("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "图片读取失败");
    }
  }

  function handleFileInput(event: React.ChangeEvent<HTMLInputElement>) {
    acceptFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
    setShowUploadPicker(false);
  }

  function openInput(input: HTMLInputElement | null) {
    input?.click();
  }

  async function parseAlipayCsvFile(file: File) {
    setStatus("parsing");
    const formData = new FormData();
    formData.append("file", file, file.name);

    const response = await fetch("/api/import-alipay-csv", {
      method: "POST",
      body: formData
    });
    const payload = (await response.json()) as {
      transactions?: ExtractedTransaction[];
      error?: string;
    };

    if (!response.ok || !payload.transactions?.length) {
      throw new Error(payload.error || "支付宝 CSV 解析失败");
    }

    setTransactions(payload.transactions.map((record, index) => transactionFromExtracted(record, index, file.name)));
    router.push("/review");
  }

  async function recognizeFiles() {
    try {
      setError("");
      const csvFile = selectedCsvFile();
      if (csvFile) {
        await parseAlipayCsvFile(csvFile);
        return;
      }

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
          type: record.type,
          refundAmount: record.refundAmount,
          note: record.note
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
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        支持 jpg、jpeg、png、webp 截图，也支持支付宝导出的 CSV 账单。
      </p>
      <input
        accept="image/jpeg,image/jpg,image/png,image/webp"
        capture="environment"
        className="fixed -left-[9999px] top-0 size-px opacity-0"
        onChange={handleFileInput}
        ref={cameraInputRef}
        type="file"
      />
      <input
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="fixed -left-[9999px] top-0 size-px opacity-0"
        multiple
        onChange={handleFileInput}
        ref={galleryInputRef}
        type="file"
      />
      <input
        accept="image/jpeg,image/jpg,image/png,image/webp,.csv,text/csv,application/vnd.ms-excel"
        className="fixed -left-[9999px] top-0 size-px opacity-0"
        multiple
        onChange={handleFileInput}
        ref={fileInputRef}
        type="file"
      />
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button onClick={() => setShowUploadPicker(true)} type="button">
          选择文件或截图
        </Button>
        <Button disabled={!files.length || status !== "idle"} onClick={recognizeFiles} variant="secondary">
          {status === "recognizing"
            ? "识别中"
            : status === "classifying"
              ? "分类中"
              : status === "parsing"
                ? "解析中"
                : selectedCsvFile()
                  ? "开始导入"
                  : "开始识别"}
        </Button>
      </div>
      {showUploadPicker ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-foreground/40 px-4 py-5"
          onClick={() => setShowUploadPicker(false)}
        >
          <div
            className="w-full rounded-md bg-card p-4 text-left shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-base font-semibold">请选择上传方式</h3>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Button
                className="h-12"
                onClick={() => openInput(cameraInputRef.current)}
                type="button"
                variant="secondary"
              >
                相机拍照
              </Button>
              <Button
                className="h-12"
                onClick={() => openInput(galleryInputRef.current)}
                type="button"
                variant="secondary"
              >
                手机相册
              </Button>
              <Button className="h-12" onClick={() => openInput(fileInputRef.current)} type="button" variant="secondary">
                选择文件
              </Button>
            </div>
            <Button className="mt-3 w-full" onClick={() => setShowUploadPicker(false)} type="button" variant="ghost">
              取消
            </Button>
          </div>
        </div>
      ) : null}
      {files.length ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {selectedCsvFile() ? `已选择支付宝 CSV：${files[0].name}` : `已选择 ${files.length} 张截图`}
        </p>
      ) : null}
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
