import { NextResponse } from "next/server";
import { parseAlipayCsv } from "@/lib/alipay-csv";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "请上传支付宝 CSV 账单" }, { status: 400 });
    }

    const transactions = parseAlipayCsv(await file.arrayBuffer());

    if (!transactions.length) {
      return NextResponse.json({ error: "未识别到可导入的支付宝交易" }, { status: 400 });
    }

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error(`[import-alipay-csv] fail: ${error instanceof Error ? error.message : "解析失败"}`);
    return NextResponse.json({ error: error instanceof Error ? error.message : "支付宝 CSV 解析失败" }, { status: 500 });
  }
}
