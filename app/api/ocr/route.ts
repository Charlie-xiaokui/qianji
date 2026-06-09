import { NextResponse } from "next/server";
import { extractTransactionsFromImage } from "@/lib/minimax";

export const runtime = "nodejs";

const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const formData = await request.formData();
  const files = formData.getAll("images").filter((item): item is File => item instanceof File);

  if (!files.length) {
    return NextResponse.json({ error: "请上传账单截图" }, { status: 400 });
  }

  const warnings: string[] = [];
  const nested = await Promise.all(
    files.map(async (file) => {
      if (!acceptedTypes.has(file.type)) {
        warnings.push(`${file.name}: 不支持的图片格式`);
        return [];
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const transactions = await extractTransactionsFromImage({
        mimeType: file.type,
        base64: buffer.toString("base64"),
        fileName: file.name
      });

      if (!transactions.length) {
        warnings.push(`${file.name}: 未识别到账单`);
      }

      return transactions;
    })
  );

  return NextResponse.json({
    transactions: nested.flat(),
    warnings
  });
}
