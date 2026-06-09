import { CATEGORY_OPTIONS, type CategoryResult } from "@/lib/types";

const fallbackCategory: CategoryResult = {
  category: "其它",
  subcategory: "其它"
};

const keywordRules: Array<{ category: string; subcategory: string; keywords: string[] }> = [
  {
    category: "收入",
    subcategory: "其它",
    keywords: ["余额宝", "收益发放"]
  },
  {
    category: "收入",
    subcategory: "理财收益",
    keywords: ["基金收益", "利息"]
  },
  {
    category: "收入",
    subcategory: "收红包",
    keywords: ["微信红包-来自", "红包"]
  },
  {
    category: "育儿",
    subcategory: "月嫂",
    keywords: ["微信转账给香梅阿姨", "香梅阿姨"]
  },
  {
    category: "转出",
    subcategory: "其它",
    keywords: ["转账-转给", "转给"]
  },
  {
    category: "育儿",
    subcategory: "产检",
    keywords: ["产检"]
  },
  {
    category: "育儿",
    subcategory: "奶粉",
    keywords: ["奶粉"]
  },
  {
    category: "育儿",
    subcategory: "辅食",
    keywords: ["辅食", "宝宝馋了", "宝宝", "儿童", "婴儿", "虾皮"]
  },
  {
    category: "育儿",
    subcategory: "纸尿裤",
    keywords: ["纸尿裤"]
  },
  {
    category: "育儿",
    subcategory: "玩具",
    keywords: ["玩具"]
  },
  {
    category: "育儿",
    subcategory: "疫苗",
    keywords: ["疫苗"]
  },
  {
    category: "育儿",
    subcategory: "早教",
    keywords: ["早教"]
  },
  {
    category: "育儿",
    subcategory: "就诊",
    keywords: ["就诊"]
  },
  {
    category: "育儿",
    subcategory: "住院",
    keywords: ["住院"]
  },
  {
    category: "育儿",
    subcategory: "奶瓶",
    keywords: ["奶瓶"]
  },
  {
    category: "服饰装扮",
    subcategory: "其它",
    keywords: ["服装", "鞋", "裤", "t恤", "T恤", "裙子", "裙", "帽", "淘宝服饰", "鹿向南"]
  },
  {
    category: "衣服",
    subcategory: "其它",
    keywords: ["衣服"]
  },
  {
    category: "日用百货",
    subcategory: "其它",
    keywords: ["日用", "纸巾", "洗衣液", "清洁", "收纳", "百货"]
  },
  {
    category: "餐饮",
    subcategory: "三餐",
    keywords: ["外卖", "美团", "饿了么", "饭", "餐", "面", "粉", "粥", "包子", "饺子", "肯德基", "麦当劳", "simply organic", "有机大蒜粉", "大蒜粉", "香料", "调味料", "食品"]
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
    category: "火车出行",
    subcategory: "其它",
    keywords: ["高铁", "火车", "动车"]
  },
  {
    category: "交通",
    subcategory: "停车费",
    keywords: ["停车"]
  },
  {
    category: "交通",
    subcategory: "充电",
    keywords: ["充电"]
  },
  {
    category: "交通",
    subcategory: "配件",
    keywords: ["车配件", "配件"]
  },
  {
    category: "交通",
    subcategory: "停车费",
    keywords: ["地铁", "滴滴", "打车", "出行"]
  },
  {
    category: "日用百货",
    subcategory: "其它",
    keywords: ["淘宝", "天猫", "京东", "拼多多"]
  }
];

export function getDefaultSubcategory(category: string) {
  return CATEGORY_OPTIONS[category]?.[0] ?? "其它";
}

export function isAllowedCategory(category: string, subcategory: string) {
  return category in CATEGORY_OPTIONS && CATEGORY_OPTIONS[category].includes(subcategory);
}

export function validateCategoryResult(category: string, subcategory: string): CategoryResult | undefined {
  if (!(category in CATEGORY_OPTIONS)) return undefined;

  return {
    category,
    subcategory: CATEGORY_OPTIONS[category].includes(subcategory) ? subcategory : getDefaultSubcategory(category)
  };
}

export function classifyByKeywordRule(merchant: string): CategoryResult | undefined {
  const normalized = merchant.trim().toLowerCase();
  if (!normalized) return undefined;

  const rule = keywordRules.find((item) => item.keywords.some((keyword) => normalized.includes(keyword.toLowerCase())));
  if (!rule) return undefined;
  return validateCategoryResult(rule.category, rule.subcategory);
}

export function normalizeCategoryResult(payload: unknown, merchant?: string): CategoryResult {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const category = String(record.category || "");
    const subcategory = String(record.subcategory || "");

    const validated = validateCategoryResult(category, subcategory);
    if (validated) return validated;
  }

  return (merchant ? classifyByKeywordRule(merchant) : undefined) ?? fallbackCategory;
}

export function isFallbackCategory(category?: CategoryResult) {
  return !category || (category.category === "其它" && category.subcategory === "其它");
}
