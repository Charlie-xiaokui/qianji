import { NextResponse } from "next/server";
import { parseBillFile } from "@/lib/importers/detect-source";

export const runtime = "nodejs";
const maxFileSize = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "请上传支付宝或微信 CSV、XLSX 或 XLS 账单" }, { status: 400 });
    }

    if (file.size > maxFileSize) {
      return NextResponse.json({ error: "文件过大或读取失败，请上传 10MB 以内的账单文件" }, { status: 400 });
    }

    const result = parseBillFile(await file.arrayBuffer(), file.name);

    if (!result.transactions.length) {
      return NextResponse.json({ error: "文件中没有有效交易" }, { status: 400 });
    }

    return NextResponse.json({ source: result.source, transactions: result.transactions });
  } catch (error) {
    console.error(`[import-bill-file] fail: ${error instanceof Error ? error.message : "解析失败"}`);
    return NextResponse.json({ error: error instanceof Error ? error.message : "账单文件解析失败" }, { status: 500 });
  }
}
