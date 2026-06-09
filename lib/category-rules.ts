import { categories, type CategoryResult } from "@/lib/types";

const fallbackCategory: CategoryResult = {
  category: "其它",
  subcategory: "其它"
};

const keywordRules: Array<{ category: string; subcategory: string; keywords: string[] }> = [
  {
    category: "收入",
    subcategory: "理财收益",
    keywords: ["余额宝", "收益发放", "基金收益", "利息"]
  },
  {
    category: "收入",
    subcategory: "红包收入",
    keywords: ["微信红包-来自", "红包"]
  },
  {
    category: "转出",
    subcategory: "其它",
    keywords: ["转账-转给", "转给"]
  },
  {
    category: "婴儿食品",
    subcategory: "其它",
    keywords: ["宝宝", "儿童", "婴儿", "虾皮", "辅食", "奶粉", "调味料", "宝宝馋了", "organic", "大蒜粉", "香料", "食品"]
  },
  {
    category: "服饰装扮",
    subcategory: "其它",
    keywords: ["衣服", "服装", "裙", "裤", "鞋", "帽", "淘宝服饰", "鹿向南"]
  },
  {
    category: "日用百货",
    subcategory: "其它",
    keywords: ["日用", "纸巾", "洗衣液", "清洁", "收纳", "百货"]
  },
  {
    category: "餐饮",
    subcategory: "三餐",
    keywords: ["外卖", "美团", "饿了么", "饭", "餐", "面", "粉", "粥", "包子", "饺子", "肯德基", "麦当劳"]
  },
  {
    category: "餐饮",
    subcategory: "零食",
    keywords: ["奶茶", "咖啡", "瑞幸", "星巴克", "茶", "甜品", "零食", "饮料"]
  },
  {
    category: "电器数码",
    subcategory: "其它",
    keywords: ["MiniMax", "OpenAI", "Claude", "API", "服务器", "阿里云", "腾讯云", "软件", "会员", "订阅", "数码"]
  },
  {
    category: "交通",
    subcategory: "停车费",
    keywords: ["地铁", "高铁", "滴滴", "打车", "出行", "停车"]
  },
  {
    category: "交通",
    subcategory: "充电",
    keywords: ["充电"]
  },
  {
    category: "交通",
    subcategory: "配件",
    keywords: ["配件"]
  },
  {
    category: "日用百货",
    subcategory: "其它",
    keywords: ["淘宝", "天猫", "京东", "拼多多"]
  }
];

export function isAllowedCategory(category: string, subcategory: string) {
  return category in categories && categories[category].includes(subcategory);
}

export function classifyByKeywordRule(merchant: string): CategoryResult | undefined {
  const normalized = merchant.trim().toLowerCase();
  if (!normalized) return undefined;

  const rule = keywordRules.find((item) => item.keywords.some((keyword) => normalized.includes(keyword.toLowerCase())));
  if (!rule || !isAllowedCategory(rule.category, rule.subcategory)) return undefined;

  return {
    category: rule.category,
    subcategory: rule.subcategory
  };
}

export function normalizeCategoryResult(payload: unknown, merchant?: string): CategoryResult {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const category = String(record.category || "");
    const subcategory = String(record.subcategory || "");

    if (isAllowedCategory(category, subcategory)) {
      return { category, subcategory };
    }
  }

  return (merchant ? classifyByKeywordRule(merchant) : undefined) ?? fallbackCategory;
}

export function isFallbackCategory(category?: CategoryResult) {
  return !category || (category.category === "其它" && category.subcategory === "其它");
}
