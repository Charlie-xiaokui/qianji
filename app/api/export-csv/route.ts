import { generateQianjiCsv } from "@/lib/csv";
import type { Transaction } from "@/lib/types";

export const runtime = "nodejs";

async function parseExportRequest(request: Request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { transactions?: unknown; account2?: unknown };
    return {
      transactions: body.transactions,
      account2: typeof body.account2 === "string" ? body.account2 : ""
    };
  }

  const formData = await request.formData();
  const transactions = formData.get("transactions");
  const account2 = formData.get("account2");

  return {
    transactions: typeof transactions === "string" ? JSON.parse(transactions) : undefined,
    account2: typeof account2 === "string" ? account2 : ""
  };
}

function isTransactionList(value: unknown): value is Transaction[] {
  if (!Array.isArray(value)) return false;

  return value.every((item) => {
    if (!item || typeof item !== "object") return false;

    const transaction = item as Record<string, unknown>;
    return (
      typeof transaction.id === "string" &&
      typeof transaction.platform === "string" &&
      typeof transaction.merchant === "string" &&
      typeof transaction.amount === "number" &&
      typeof transaction.datetime === "string" &&
      typeof transaction.type === "string" &&
      typeof transaction.category === "string" &&
      typeof transaction.subcategory === "string"
    );
  });
}

export async function POST(request: Request) {
  try {
    const payload = await parseExportRequest(request);

    if (!isTransactionList(payload.transactions)) {
      return Response.json({ error: "导出记录格式错误" }, { status: 400 });
    }

    const transactions = payload.transactions.filter((transaction) => transaction.selected);
    if (!transactions.length) {
      return Response.json({ error: "没有可导出的记录" }, { status: 400 });
    }

    const csv = generateQianjiCsv(transactions, { account2: payload.account2 });

    return new Response(csv, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": 'attachment; filename="qianji_import.csv"',
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    console.error(`[export-csv] fail: ${error instanceof Error ? error.message : "CSV 生成失败"}`);
    return Response.json({ error: "CSV 生成失败" }, { status: 500 });
  }
}
