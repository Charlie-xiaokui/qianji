import { validateCategoryResult } from "@/lib/category-rules";
import { categories, type CategoryResult, type OcrTransaction } from "@/lib/types";

const categorySchema = {
  type: "object",
  required: ["category", "subcategory"],
  properties: {
    category: {
      type: "string",
      enum: Object.keys(categories)
    },
    subcategory: {
      type: "string"
    }
  },
  additionalProperties: false
} as const;

const allowedCategoryText = Object.entries(categories)
  .map(([category, subcategories]) => `${category}: ${subcategories.join(", ")}`)
  .join("\n");

const categoryPrompt = `你是钱迹账单导入分类助手。
根据商户名称判断最适合的钱迹分类。
只返回严格 JSON，不要 Markdown，不要解释，不要返回其它字段。

可选分类：
${allowedCategoryText}

固定规则：
merchant 包含 "杭州城市通交通卡有限公司" -> {"category":"交通","subcategory":"交通卡充值"}
merchant 包含 "外卖"、"美团"、"饿了么"、"饭"、"餐"、"面"、"粉"、"粥"、"包子"、"饺子"、"肯德基"、"麦当劳" -> {"category":"餐饮","subcategory":"三餐"}
merchant 包含 "奶茶"、"咖啡"、"瑞幸"、"星巴克"、"茶"、"甜品"、"零食"、"饮料" -> {"category":"餐饮","subcategory":"零食"}
merchant 包含 "宝宝馋了"、"辅食" -> {"category":"育儿","subcategory":"辅食"}
merchant 包含 "奶粉" -> {"category":"育儿","subcategory":"奶粉"}
merchant 包含 "纸尿裤" -> {"category":"育儿","subcategory":"纸尿裤"}
merchant 包含 "玩具" -> {"category":"育儿","subcategory":"玩具"}
merchant 包含 "疫苗" -> {"category":"育儿","subcategory":"疫苗"}
merchant 包含 "早教" -> {"category":"育儿","subcategory":"早教"}
merchant 包含 "月嫂" 或 "香梅阿姨" -> {"category":"育儿","subcategory":"月嫂"}
merchant 包含 "产检" -> {"category":"育儿","subcategory":"产检"}
merchant 包含 "就诊" -> {"category":"育儿","subcategory":"就诊"}
merchant 包含 "住院" -> {"category":"育儿","subcategory":"住院"}
merchant 包含 "simply organic"、"有机大蒜粉"、"大蒜粉"、"香料"、"调味料"、"食品" -> {"category":"餐饮","subcategory":"三餐"}
merchant 包含 "衣服" -> {"category":"衣服","subcategory":"其它"}
merchant 包含 "服装"、"鞋"、"裤"、"T恤"、"裙子"、"裙"、"帽"、"淘宝服饰"、"鹿向南" -> {"category":"服饰装扮","subcategory":"其它"}
merchant 包含 "日用"、"纸巾"、"洗衣液"、"清洁"、"收纳"、"百货" -> {"category":"日用百货","subcategory":"其它"}
merchant 包含 "MiniMax"、"OpenAI"、"Claude"、"API"、"服务器"、"阿里云"、"腾讯云"、"软件"、"会员"、"订阅"、"数码" -> {"category":"电器数码","subcategory":"其它"}
merchant 包含 "高铁"、"火车"、"动车" -> {"category":"火车出行","subcategory":"其它"}
merchant 包含 "停车" -> {"category":"交通","subcategory":"停车费"}
merchant 包含 "充电" -> {"category":"交通","subcategory":"充电"}
merchant 包含 "车配件"、"配件" -> {"category":"交通","subcategory":"配件"}
merchant 包含 "淘宝"、"天猫"、"京东"、"拼多多" 时，先结合商品关键词判断；无法判断时 -> {"category":"日用百货","subcategory":"其它"}
merchant 包含 "地铁"、"滴滴"、"打车"、"出行" -> {"category":"交通","subcategory":"停车费"}
merchant 包含 "香梅阿姨" -> {"category":"育儿","subcategory":"月嫂"}
merchant 以 "转账-转给" 开头或包含 "转给" -> {"category":"转出","subcategory":"其它"}
merchant 以 "微信红包-来自" 开头 -> {"category":"收入","subcategory":"收红包"}
merchant 包含 "余额宝" 或 "收益发放" -> {"category":"收入","subcategory":"其它"}
merchant 包含 "基金收益"、"利息" -> {"category":"收入","subcategory":"理财收益"}

未知商户返回：
{"category":"其它","subcategory":"其它"}`;

const ocrPrompt = `你是钱迹账单截图 OCR 助手。
请从支付宝或微信账单截图中提取交易记录。
只返回严格 JSON 数组，不要 Markdown，不要解释。

字段：
merchant: 商户名称
amount: 数字，支出和收入都返回正数
date: 交易日期时间，格式 "YYYY-MM-DD HH:mm:ss"，如果截图只有日期则补 "00:00:00"
account: 账户或来源，只能返回 "微信账户" 或 "支付宝账户"
type: "income" 或 "expense"
refundAmount: 可选数字，账单行显示已退款金额时返回退款金额
note: 可选字符串，账单行显示已退款时写 "已退款143.99"

退款识别规则：
如果支出账单行显示 "已退款(￥7.90)"、"已退款7.90" 等信息：
- 支出记录仍按原始支出金额返回，不要用支出金额减退款金额
- refundAmount = 已退款金额
- note = "已退款" + 退款金额
- 退款如果在账单中单独出现为收入订单，再单独返回一条 income

示例：
原消费 -341.20，已退款(￥7.90) -> {"amount":341.20,"refundAmount":7.90,"type":"expense","note":"已退款7.90"}

type 识别规则：
金额前有 "+" -> income
金额前有 "-" -> expense
微信红包-来自xxx -> income
转账-转给xxx -> expense
余额宝-收益发放 -> income

日期识别规则：
如果截图出现 "今天"、"昨天"、"前天"，必须根据上传日期转换成真实日期。
例如上传日期为 2026-06-09，则今天=2026-06-09，昨天=2026-06-08，前天=2026-06-07。

如果没有识别到账单交易，返回 []。`;

function envNumber(name: string, fallback: number) {
  const value = process.env[name];
  return value ? Number(value) || fallback : fallback;
}

function parseJsonPayload(content: unknown) {
  if (typeof content !== "string") return content;
  const withoutThinking = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const trimmed = withoutThinking
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const arrayStart = trimmed.indexOf("[");
    const arrayEnd = trimmed.lastIndexOf("]");
    if (arrayStart >= 0 && arrayEnd > arrayStart) {
      return JSON.parse(trimmed.slice(arrayStart, arrayEnd + 1));
    }

    const objectStart = trimmed.indexOf("{");
    const objectEnd = trimmed.lastIndexOf("}");
    if (objectStart >= 0 && objectEnd > objectStart) {
      return JSON.parse(trimmed.slice(objectStart, objectEnd + 1));
    }

    throw new Error("无法解析 JSON");
  }
}

function isSchemaValid(payload: unknown): payload is CategoryResult {
  if (!payload || typeof payload !== categorySchema.type) return false;

  const record = payload as Record<string, unknown>;
  if (!categorySchema.required.every((key) => typeof record[key] === "string")) return false;

  const category = record.category as string;
  const subcategory = record.subcategory as string;
  return category in categories && categories[category].includes(subcategory);
}

function validateCategory(payload: unknown): CategoryResult {
  const parsed = parseJsonPayload(payload);
  if (!isSchemaValid(parsed)) {
    console.warn("[classify] api fail: invalid category schema");
    return { category: "其它", subcategory: "其它" };
  }

  return validateCategoryResult(parsed.category, parsed.subcategory) ?? { category: "其它", subcategory: "其它" };
}

function validateOcrTransactions(payload: unknown): OcrTransaction[] {
  const parsed = parseJsonPayload(payload);
  const records = Array.isArray(parsed) ? parsed : (parsed as { transactions?: unknown }).transactions;
  if (!Array.isArray(records)) return [];

  return records.flatMap((item) => {
    if (!item || typeof item !== "object") return [];

    const record = item as Record<string, unknown>;
    const merchant = String(record.merchant || "").trim();
    const amount = Number(record.amount);
    const refundAmount = Number(record.refundAmount ?? record.refundedAmount ?? record.refund ?? 0);
    const date = String(record.date || record.datetime || "").trim();
    const account = String(record.account || "").trim();
    const rawType = String(record.type || "").trim();
    const note = String(record.note || "").trim();

    if (!merchant || !Number.isFinite(amount) || amount <= 0 || !date) return [];
    const actualAmount = normalizeRefundedAmount(amount);
    if (!Number.isFinite(actualAmount) || actualAmount <= 0) return [];

    return [
      {
        merchant,
        amount: actualAmount,
        date,
        account: account.includes("支付宝") ? "支付宝账户" : "微信账户",
        type: normalizeOcrType(merchant, rawType),
        ...(Number.isFinite(refundAmount) && refundAmount > 0
          ? {
              refundAmount,
              note: note || `已退款${formatMoney(refundAmount)}`
            }
          : note
            ? { note }
            : {})
      }
    ];
  });
}

function formatMoney(amount: number) {
  return amount.toFixed(2).replace(/\.?0+$/, "");
}

function normalizeRefundedAmount(amount: number) {
  return amount;
}

function normalizeOcrType(merchant: string, rawType: string) {
  if (rawType === "income" || rawType === "expense") return rawType;
  if (merchant.startsWith("微信红包-来自")) return "income";
  if (merchant.startsWith("转账-转给")) return "expense";
  if (merchant.includes("余额宝-收益发放")) return "income";
  return "expense";
}

async function requestMiniMaxClassification(merchant: string, signal: AbortSignal) {
  const apiKey = process.env.MINIMAX_API_KEY;
  const baseUrl = process.env.MINIMAX_BASE_URL || "https://api.minimaxi.com/v1";
  const apiUrl = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const model = process.env.MINIMAX_TEXT_MODEL;

  if (!apiKey) throw new Error("缺少 MINIMAX_API_KEY");
  if (!model) throw new Error("缺少 MINIMAX_TEXT_MODEL");

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: categoryPrompt },
        { role: "user", content: `商户：${merchant}` }
      ],
      temperature: 0.1,
      stream: false,
      max_completion_tokens: 256,
      thinking: { type: "disabled" }
    }),
    signal
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`MiniMax API 失败: ${response.status} ${text.slice(0, 180)}`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  const choices = data.choices as Array<{ message?: { content?: unknown } }> | undefined;
  return choices?.[0]?.message?.content ?? data;
}

function formatUploadDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

async function requestMiniMaxVision(image: { mimeType: string; base64: string }, signal: AbortSignal) {
  const apiKey = process.env.MINIMAX_API_KEY;
  const baseUrl = process.env.MINIMAX_BASE_URL || "https://api.minimaxi.com/v1";
  const apiUrl = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const model = process.env.MINIMAX_VISION_MODEL || process.env.MINIMAX_TEXT_MODEL;

  if (!apiKey) throw new Error("缺少 MINIMAX_API_KEY");
  if (!model) throw new Error("缺少 MINIMAX_VISION_MODEL 或 MINIMAX_TEXT_MODEL");

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: ocrPrompt },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `上传日期：${formatUploadDate()}。识别这张账单截图，返回交易 JSON 数组。`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${image.mimeType};base64,${image.base64}`
              }
            }
          ]
        }
      ],
      temperature: 0.1,
      stream: false,
      max_completion_tokens: 1024,
      thinking: { type: "disabled" }
    }),
    signal
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`MiniMax Vision API 失败: ${response.status} ${text.slice(0, 180)}`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  const choices = data.choices as Array<{ message?: { content?: unknown } }> | undefined;
  return choices?.[0]?.message?.content ?? data;
}

async function withRetry<T>(operation: (signal: AbortSignal) => Promise<T>) {
  const maxAttempts = envNumber("MINIMAX_RETRIES", 2);
  const timeoutMs = envNumber("MINIMAX_TIMEOUT_MS", 15000);
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await operation(controller.signal);
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("MiniMax 请求失败");
}

export async function classifyMerchant(merchant: string): Promise<CategoryResult> {
  try {
    const content = await withRetry((signal) => requestMiniMaxClassification(merchant, signal));
    const category = validateCategory(content);
    console.info(`[classify] api success: ${merchant} ${category.category}/${category.subcategory}`);
    return category;
  } catch (error) {
    console.error(`[classify] api fail: ${merchant} ${error instanceof Error ? error.message : "未知错误"}`);
    return { category: "其它", subcategory: "其它" };
  }
}

export async function extractTransactionsFromImage(image: {
  mimeType: string;
  base64: string;
  fileName?: string;
}): Promise<OcrTransaction[]> {
  try {
    const content = await withRetry((signal) => requestMiniMaxVision(image, signal));
    const transactions = validateOcrTransactions(content);
    console.info(`[ocr] api success: ${image.fileName ?? "image"} ${transactions.length}`);
    return transactions;
  } catch (error) {
    console.error(
      `[ocr] api fail: ${image.fileName ?? "image"} ${error instanceof Error ? error.message : "未知错误"}`
    );
    return [];
  }
}
