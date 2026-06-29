import Papa from "papaparse";
import { normalizeCategoryResult, validateCategoryResult } from "@/lib/category-rules";
import type { CategoryResult, ExtractedTransaction, TransactionType } from "@/lib/types";

type AlipayRow = Record<string, string>;

const alipayHeaderPrefix = "交易时间,交易分类,交易对方";

function cleanCell(value: unknown) {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/\t/g, "")
    .trim();
}

function decodeAlipayCsv(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  if (utf8.includes(alipayHeaderPrefix)) return utf8;

  for (const encoding of ["gb18030", "gbk"]) {
    try {
      const decoded = new TextDecoder(encoding, { fatal: false }).decode(bytes);
      if (decoded.includes(alipayHeaderPrefix)) return decoded;
    } catch {
      // Try the next Chinese legacy encoding label supported by the runtime.
    }
  }

  return utf8;
}

function extractCsvTable(content: string) {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const headerIndex = normalized.split("\n").findIndex((line) => line.includes(alipayHeaderPrefix));
  if (headerIndex < 0) {
    throw new Error("未找到支付宝交易明细表头");
  }

  return normalized.split("\n").slice(headerIndex).join("\n");
}

function parseAmount(value: string) {
  const amount = Number(cleanCell(value).replace(/[,\s￥¥]/g, ""));
  return Number.isFinite(amount) ? Math.abs(amount) : 0;
}

function parseDate(value: string) {
  const normalized = cleanCell(value).replace(/\//g, "-");
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return `${normalized} 00:00:00`;
  return normalized;
}

function includesAny(text: string, keywords: string[]) {
  const normalized = text.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

function categoryOrFallback(category: string, subcategory: string, merchantText: string): CategoryResult {
  return validateCategoryResult(category, subcategory) ?? normalizeCategoryResult(undefined, merchantText);
}

function classifyParenting(text: string) {
  const rules: Array<[string, string[]]> = [
    ["奶粉", ["奶粉"]],
    ["奶瓶", ["奶瓶"]],
    ["辅食", ["辅食", "宝宝馋了"]],
    ["纸尿裤", ["纸尿裤", "尿不湿", "拉拉裤"]],
    ["玩具", ["玩具"]],
    ["衣服", ["衣服", "童装", "宝宝衣", "婴儿衣", "儿童衣", "儿童服"]],
    ["药品", ["药品", "药"]],
    ["早教", ["早教"]],
    ["亲子游", ["亲子游"]],
    ["疫苗", ["疫苗"]],
    ["就诊", ["就诊"]],
    ["月嫂", ["月嫂", "香梅阿姨"]],
    ["住院", ["住院"]]
  ];
  const matched = rules.find(([, keywords]) => includesAny(text, keywords));
  return categoryOrFallback("育儿", matched?.[0] ?? "其它", text);
}

function classifyHousing(text: string) {
  if (includesAny(text, ["厨房", "锅", "水槽", "厨具"])) return categoryOrFallback("住房", "厨房", text);
  if (includesAny(text, ["家电"])) return categoryOrFallback("住房", "家电", text);
  if (includesAny(text, ["家具"])) return categoryOrFallback("住房", "家具", text);
  if (includesAny(text, ["纸巾", "清洁", "垃圾袋", "日用品", "日用"])) {
    return categoryOrFallback("住房", "日用品", text);
  }
  return categoryOrFallback("住房", "日用品", text);
}

function classifyAlipayTransaction(alipayCategory: string, description: string, counterparty: string) {
  const text = `${alipayCategory} ${description} ${counterparty}`;

  if (alipayCategory === "退款" || description.startsWith("退款-")) {
    return categoryOrFallback("收入", "退款", text);
  }
  if (includesAny(text, ["余额宝", "收益发放"])) return categoryOrFallback("收入", "理财收益", text);
  if (alipayCategory === "母婴亲子") return classifyParenting(text);
  if (alipayCategory === "交通出行") {
    if (includesAny(text, ["停车", "停车费"])) return categoryOrFallback("交通", "停车费", text);
    if (includesAny(text, ["充电"])) return categoryOrFallback("交通", "充电", text);
    if (includesAny(text, ["配件", "车配件"])) return categoryOrFallback("交通", "配件", text);
    if (includesAny(text, ["高铁", "火车", "动车"])) return categoryOrFallback("火车出行", "其它", text);
    return categoryOrFallback("交通", "停车费", text);
  }
  if (alipayCategory === "爱车养车") return categoryOrFallback("爱车养车", "其它", text);
  if (alipayCategory === "餐饮美食") {
    if (includesAny(text, ["奶茶", "饭", "餐", "咖啡", "外卖", "面", "粉", "粥"])) {
      return categoryOrFallback("餐饮", "三餐", text);
    }
    return categoryOrFallback("餐饮美食", "其它", text);
  }
  if (alipayCategory === "日用百货") return categoryOrFallback("日用百货", "其它", text);
  if (alipayCategory === "家居家装") return classifyHousing(text);
  if (alipayCategory === "服饰装扮") return categoryOrFallback("服饰装扮", "其它", text);
  if (alipayCategory === "数码电器" || alipayCategory === "电器数码") {
    return categoryOrFallback("电器数码", "其它", text);
  }
  if (alipayCategory === "医疗健康") return categoryOrFallback("医疗", "其它", text);
  if (alipayCategory === "投资理财" && includesAny(text, ["余额宝", "收益发放"])) {
    return categoryOrFallback("收入", "理财收益", text);
  }

  return normalizeCategoryResult(undefined, text);
}

function getType(row: AlipayRow, amount: number): TransactionType | undefined {
  const direction = cleanCell(row["收/支"]);
  const category = cleanCell(row["交易分类"]);
  const description = cleanCell(row["商品说明"]);

  if (amount <= 0) return undefined;
  if (direction === "支出") return "expense";
  if (direction === "收入") return "income";

  if (direction === "不计收支") {
    if (includesAny(`${category} ${description}`, ["余额宝", "收益发放"])) return "income";
    if (category === "退款" || description.startsWith("退款-")) return "income";
  }

  return undefined;
}

function buildNote(counterparty: string, description: string) {
  return description ? `支付宝-${counterparty}-${description}` : `支付宝-${counterparty}`;
}

function parseRows(table: string) {
  const parsed = Papa.parse<string[]>(table, {
    skipEmptyLines: true
  });
  const rows = parsed.data;
  const headers = rows[0]?.map(cleanCell) ?? [];

  return rows.slice(1).map((cells) =>
    headers.reduce<AlipayRow>((record, header, index) => {
      if (header) record[header] = cleanCell(cells[index]);
      return record;
    }, {})
  );
}

export function parseAlipayCsv(buffer: ArrayBuffer): ExtractedTransaction[] {
  const content = decodeAlipayCsv(buffer);
  const table = extractCsvTable(content);
  const rows = parseRows(table);

  return rows.flatMap((row) => {
    const date = parseDate(row["交易时间"]);
    const alipayCategory = cleanCell(row["交易分类"]);
    const counterparty = cleanCell(row["交易对方"]);
    const description = cleanCell(row["商品说明"]);
    const amount = parseAmount(row["金额"]);
    const type = getType(row, amount);

    if (!date || !counterparty || !type) return [];

    const category = classifyAlipayTransaction(alipayCategory, description, counterparty);

    return [
      {
        platform: "alipay",
        merchant: description || counterparty,
        amount,
        datetime: date,
        type,
        category: category.category,
        subcategory: category.subcategory,
        note: buildNote(counterparty, description)
      }
    ];
  });
}
