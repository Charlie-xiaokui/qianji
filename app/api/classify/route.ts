import { NextResponse } from "next/server";
import { classifyMerchant } from "@/lib/minimax";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { merchant?: string };
    const merchant = body.merchant?.trim();

    if (!merchant) {
      return NextResponse.json({ error: "缺少商户名称" }, { status: 400 });
    }

    const category = await classifyMerchant(merchant);
    return NextResponse.json(category);
  } catch (error) {
    console.error(`[classify] api fail: ${error instanceof Error ? error.message : "分类失败"}`);
    return NextResponse.json({ category: "其它", subcategory: "其它" });
  }
}
