"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/button";
import { classifyTransactionsWithCache, transactionFromExtracted } from "@/lib/classification";
import { filesToOcrFormData } from "@/lib/image";
import type { ExtractedTransaction, OcrTransaction } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useImportStore } from "@/store/import-store";

const imageAccept = "image/jpeg,image/jpg,image/png,image/webp";
const billFileAccept = `${imageAccept},.csv,.xlsx,.xls,text/csv,application/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`;
const billFileExtensions = [".csv", ".xlsx", ".xls"];
const unsupportedBillExtensions = new Set([".zip"]);

type UploadInputProps = {
  accept: string;
  capture?: "environment";
  inputRef: React.RefObject<HTMLInputElement | null>;
  label: string;
  multiple?: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

function UploadInputOption({ accept, capture, inputRef, label, multiple, onChange }: UploadInputProps) {
  return (
    <div
      className={cn(
        "relative inline-flex min-h-12 items-center justify-center overflow-hidden rounded-md border bg-card px-4 text-sm font-medium transition hover:bg-muted"
      )}
      onClick={(event) => {
        if (event.target instanceof HTMLInputElement) return;
        inputRef.current?.click();
      }}
      role="button"
      tabIndex={0}
    >
      {label}
      <input
        accept={accept}
        capture={capture}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        multiple={multiple}
        onChange={onChange}
        ref={inputRef}
        type="file"
      />
    </div>
  );
}

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

  function isBillFile(file: File) {
    const lower = file.name.toLowerCase();
    return billFileExtensions.some((extension) => lower.endsWith(extension));
  }

  function hasUnsupportedBillExtension(file: File) {
    const lower = file.name.toLowerCase();
    return Array.from(unsupportedBillExtensions).some((extension) => lower.endsWith(extension));
  }

  function selectedBillFile() {
    return files.length === 1 && isBillFile(files[0]) ? files[0] : undefined;
  }

  function acceptFiles(nextFiles: File[]) {
    if (!nextFiles.length) return;

    try {
      const unsupportedFile = nextFiles.find(hasUnsupportedBillExtension);
      if (unsupportedFile) {
        throw new Error("当前支持支付宝或微信导出的 CSV、XLSX、XLS 账单，暂不支持 ZIP");
      }

      const billFiles = nextFiles.filter(isBillFile);
      if (billFiles.length) {
        if (nextFiles.length > 1) {
          throw new Error("账单文件请单独上传，不要和截图混选");
        }
        setFiles(billFiles);
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

  async function parseBillFile(file: File) {
    setStatus("parsing");
    const formData = new FormData();
    formData.append("file", file, file.name);

    const response = await fetch("/api/import-bill-file", {
      method: "POST",
      body: formData
    });
    const payload = (await response.json()) as {
      transactions?: ExtractedTransaction[];
      source?: "alipay" | "wechat";
      error?: string;
    };

    if (!response.ok || !payload.transactions?.length) {
      throw new Error(payload.error || "账单文件解析失败");
    }

    const transactions = payload.transactions.map((record, index) => transactionFromExtracted(record, index, file.name));
    setStatus("classifying");
    setTransactions(await classifyTransactionsWithCache(transactions));
    router.push("/review");
  }

  async function recognizeFiles() {
    try {
      setError("");
      const csvFile = selectedBillFile();
      if (csvFile) {
        await parseBillFile(csvFile);
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
          note: record.note,
          source: "ocr",
          ocrText: `${record.merchant} ${record.note ?? ""} ${record.account}`
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
      <h2 className="text-lg font-semibold">上传支付宝或微信账单</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        支持 jpg、jpeg、png、webp 截图，也支持支付宝或微信支付导出的 CSV、XLSX、XLS 账单。
      </p>
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
                : selectedBillFile()
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
              <UploadInputOption
                accept={imageAccept}
                capture="environment"
                inputRef={cameraInputRef}
                label="相机拍照"
                onChange={handleFileInput}
              />
              <UploadInputOption
                accept={imageAccept}
                inputRef={galleryInputRef}
                label="手机相册"
                multiple
                onChange={handleFileInput}
              />
              <UploadInputOption
                accept={billFileAccept}
                inputRef={fileInputRef}
                label="选择文件"
                multiple
                onChange={handleFileInput}
              />
            </div>
            <Button className="mt-3 w-full" onClick={() => setShowUploadPicker(false)} type="button" variant="ghost">
              取消
            </Button>
          </div>
        </div>
      ) : null}
      {files.length ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {selectedBillFile() ? `已选择账单文件：${files[0].name}` : `已选择 ${files.length} 张截图`}
        </p>
      ) : null}
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
