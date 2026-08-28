import { CATEGORY_OPTIONS, type CategoryResult, type ImportSource, type Transaction } from "@/lib/types";

type RuleMatch = {
  includesAny?: string[];
  includesAll?: string[];
  exactAny?: string[];
  excludesAny?: string[];
  sources?: ImportSource[];
};

export type CategoryRule = {
  id: string;
  description: string;
  enabled: boolean;
  priority: number;
  match: RuleMatch;
  result: CategoryResult;
};

export type DefaultSelectionRule = {
  id: string;
  description: string;
  enabled: boolean;
  priority: number;
  accounts?: string[];
  match: RuleMatch;
  selected: boolean;
};

export type MatchedCategoryRule = CategoryResult & {
  ruleId: string;
};

export type DefaultSelectionResult = {
  selected: boolean;
  ruleId?: string;
};

const fallbackCategory: CategoryResult = {
  category: "其它",
  subcategory: "其它"
};

const connectorPattern = /[-－—–]/g;
const whitespacePattern = /[\s\u3000]+/g;

function logRuleMatch(type: "category" | "selection", ruleId: string, source?: ImportSource) {
  if (process.env.NODE_ENV !== "development") return;
  console.debug(`[rules] ${type} matched: ${ruleId}${source ? ` source=${source}` : ""}`);
}

export function normalizeRuleText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(connectorPattern, "-").replace(whitespacePattern, " ").trim().toLowerCase();
}

function transactionSource(transaction: Partial<Transaction>): ImportSource | undefined {
  return transaction.source ?? transaction.platform;
}

export function getTransactionSearchText(transaction: Partial<Transaction>) {
  const record = transaction as Record<string, unknown>;
  return [
    record.merchant,
    record.title,
    record.description,
    record.remark,
    record.counterparty,
    record.transactionTarget,
    record.originalCategory,
    record.rawCategory,
    record.rawText,
    record.sourceDescription,
    record.alipayTitle,
    record.alipayCounterparty,
    record.wechatProduct,
    record.wechatCounterparty,
    record.ocrText,
    record.note,
    record.paymentMethod,
    record.status,
    record.sourceFile,
    record.category,
    record.subcategory
  ]
    .map(normalizeRuleText)
    .filter(Boolean)
    .join(" ");
}

function normalizedKeywords(values?: string[]) {
  return values?.map(normalizeRuleText).filter(Boolean) ?? [];
}

function matchesRule(text: string, match: RuleMatch, source?: ImportSource) {
  if (match.sources?.length && (!source || !match.sources.includes(source))) return false;

  const excludesAny = normalizedKeywords(match.excludesAny);
  if (excludesAny.some((keyword) => text.includes(keyword))) return false;

  const exactAny = normalizedKeywords(match.exactAny);
  if (exactAny.length && !exactAny.includes(text)) return false;

  const includesAll = normalizedKeywords(match.includesAll);
  if (includesAll.length && !includesAll.every((keyword) => text.includes(keyword))) return false;

  const includesAny = normalizedKeywords(match.includesAny);
  if (includesAny.length && !includesAny.some((keyword) => text.includes(keyword))) return false;

  return exactAny.length > 0 || includesAll.length > 0 || includesAny.length > 0;
}

function sortByPriority<T extends { priority: number }>(rules: T[]) {
  return [...rules].sort((left, right) => right.priority - left.priority);
}

export const businessCategoryRules: CategoryRule[] = [
  {
    id: "hangzhou-city-pass-recharge",
    description: "杭州城市通交通卡有限公司归类为交通卡充值",
    enabled: true,
    priority: 1000,
    match: {
      includesAny: ["杭州城市通交通卡有限公司"]
    },
    result: {
      category: "交通",
      subcategory: "交通卡充值"
    }
  }
];

export const keywordFallbackRules: CategoryRule[] = [
  {
    id: "income-yuebao",
    description: "余额宝或收益发放归类为收入其它",
    enabled: true,
    priority: 200,
    match: { includesAny: ["余额宝", "收益发放"] },
    result: { category: "收入", subcategory: "其它" }
  },
  {
    id: "income-investment-yield",
    description: "基金收益、利息归类为理财收益",
    enabled: true,
    priority: 200,
    match: { includesAny: ["基金收益", "利息"] },
    result: { category: "收入", subcategory: "理财收益" }
  },
  {
    id: "income-red-packet",
    description: "微信红包归类为收红包",
    enabled: true,
    priority: 200,
    match: { includesAny: ["微信红包-来自", "红包"] },
    result: { category: "收入", subcategory: "收红包" }
  },
  {
    id: "income-refund",
    description: "退款归类为收入退款",
    enabled: true,
    priority: 200,
    match: { includesAny: ["退款-", "退款"] },
    result: { category: "收入", subcategory: "退款" }
  },
  {
    id: "parenting-nanny",
    description: "月嫂、香梅阿姨归类为育儿月嫂",
    enabled: true,
    priority: 200,
    match: { includesAny: ["微信转账给香梅阿姨", "香梅阿姨", "月嫂"] },
    result: { category: "育儿", subcategory: "月嫂" }
  },
  {
    id: "transfer-out",
    description: "转账转出归类为转出",
    enabled: true,
    priority: 200,
    match: { includesAny: ["转账-转给", "转给"] },
    result: { category: "转出", subcategory: "其它" }
  },
  {
    id: "parenting-pregnancy-check",
    description: "产检归类为育儿产检",
    enabled: true,
    priority: 180,
    match: { includesAny: ["产检"] },
    result: { category: "育儿", subcategory: "产检" }
  },
  {
    id: "parenting-milk-powder",
    description: "奶粉归类为育儿奶粉",
    enabled: true,
    priority: 180,
    match: { includesAny: ["奶粉"] },
    result: { category: "育儿", subcategory: "奶粉" }
  },
  {
    id: "parenting-food",
    description: "辅食、宝宝等关键词归类为育儿辅食",
    enabled: true,
    priority: 170,
    match: { includesAny: ["辅食", "宝宝馋了", "宝宝", "儿童", "婴儿", "虾皮"] },
    result: { category: "育儿", subcategory: "辅食" }
  },
  {
    id: "parenting-diapers",
    description: "纸尿裤归类为育儿纸尿裤",
    enabled: true,
    priority: 180,
    match: { includesAny: ["纸尿裤", "尿不湿", "拉拉裤"] },
    result: { category: "育儿", subcategory: "纸尿裤" }
  },
  {
    id: "parenting-toys",
    description: "玩具归类为育儿玩具",
    enabled: true,
    priority: 180,
    match: { includesAny: ["玩具"] },
    result: { category: "育儿", subcategory: "玩具" }
  },
  {
    id: "parenting-vaccine",
    description: "疫苗归类为育儿疫苗",
    enabled: true,
    priority: 180,
    match: { includesAny: ["疫苗"] },
    result: { category: "育儿", subcategory: "疫苗" }
  },
  {
    id: "parenting-early-education",
    description: "早教归类为育儿早教",
    enabled: true,
    priority: 180,
    match: { includesAny: ["早教"] },
    result: { category: "育儿", subcategory: "早教" }
  },
  {
    id: "parenting-clinic",
    description: "就诊归类为育儿就诊",
    enabled: true,
    priority: 180,
    match: { includesAny: ["就诊"] },
    result: { category: "育儿", subcategory: "就诊" }
  },
  {
    id: "parenting-hospitalization",
    description: "住院归类为育儿住院",
    enabled: true,
    priority: 180,
    match: { includesAny: ["住院"] },
    result: { category: "育儿", subcategory: "住院" }
  },
  {
    id: "parenting-bottle",
    description: "奶瓶归类为育儿奶瓶",
    enabled: true,
    priority: 180,
    match: { includesAny: ["奶瓶"] },
    result: { category: "育儿", subcategory: "奶瓶" }
  },
  {
    id: "adult-clothing",
    description: "成人服饰关键词归类为服饰装扮",
    enabled: true,
    priority: 140,
    match: { includesAny: ["服装", "鞋", "裤", "t恤", "裙子", "裙", "帽", "淘宝服饰", "鹿向南"] },
    result: { category: "服饰装扮", subcategory: "其它" }
  },
  {
    id: "clothes",
    description: "衣服关键词归类为衣服",
    enabled: true,
    priority: 130,
    match: { includesAny: ["衣服"] },
    result: { category: "衣服", subcategory: "其它" }
  },
  {
    id: "daily-goods",
    description: "日用百货关键词归类为日用百货",
    enabled: true,
    priority: 120,
    match: { includesAny: ["日用", "纸巾", "洗衣液", "清洁", "收纳", "百货"] },
    result: { category: "日用百货", subcategory: "其它" }
  },
  {
    id: "alipay-parenting-category",
    description: "支付宝母婴亲子分类归类为育儿辅食",
    enabled: true,
    priority: 125,
    match: { includesAny: ["母婴亲子"] },
    result: { category: "育儿", subcategory: "辅食" }
  },
  {
    id: "alipay-dining-category",
    description: "支付宝餐饮美食分类归类为餐饮美食",
    enabled: true,
    priority: 115,
    match: { includesAny: ["餐饮美食"] },
    result: { category: "餐饮美食", subcategory: "其它" }
  },
  {
    id: "alipay-daily-category",
    description: "支付宝日用百货分类归类为日用百货",
    enabled: true,
    priority: 115,
    match: { includesAny: ["日用百货"] },
    result: { category: "日用百货", subcategory: "其它" }
  },
  {
    id: "alipay-housing-category",
    description: "支付宝家居家装分类归类为住房日用品",
    enabled: true,
    priority: 115,
    match: { includesAny: ["家居家装"] },
    result: { category: "住房", subcategory: "日用品" }
  },
  {
    id: "alipay-clothing-category",
    description: "支付宝服饰装扮分类归类为服饰装扮",
    enabled: true,
    priority: 115,
    match: { includesAny: ["服饰装扮"] },
    result: { category: "服饰装扮", subcategory: "其它" }
  },
  {
    id: "alipay-digital-category",
    description: "支付宝数码电器分类归类为电器数码",
    enabled: true,
    priority: 115,
    match: { includesAny: ["数码电器", "电器数码"] },
    result: { category: "电器数码", subcategory: "其它" }
  },
  {
    id: "alipay-medical-category",
    description: "支付宝医疗健康分类归类为医疗",
    enabled: true,
    priority: 115,
    match: { includesAny: ["医疗健康"] },
    result: { category: "医疗", subcategory: "其它" }
  },
  {
    id: "alipay-car-category",
    description: "支付宝爱车养车分类归类为爱车养车",
    enabled: true,
    priority: 115,
    match: { includesAny: ["爱车养车"] },
    result: { category: "爱车养车", subcategory: "其它" }
  },
  {
    id: "alipay-traffic-category",
    description: "支付宝交通出行分类归类为交通停车费",
    enabled: true,
    priority: 105,
    match: { includesAny: ["交通出行"] },
    result: { category: "交通", subcategory: "停车费" }
  },
  {
    id: "dining-meal",
    description: "餐饮三餐关键词归类为餐饮三餐",
    enabled: true,
    priority: 120,
    match: {
      includesAny: [
        "外卖",
        "美团",
        "饿了么",
        "饭",
        "餐",
        "面",
        "粉",
        "粥",
        "包子",
        "饺子",
        "肯德基",
        "麦当劳",
        "simply organic",
        "有机大蒜粉",
        "大蒜粉",
        "香料",
        "调味料",
        "食品"
      ]
    },
    result: { category: "餐饮", subcategory: "三餐" }
  },
  {
    id: "dining-snack",
    description: "零食饮品关键词归类为餐饮零食",
    enabled: true,
    priority: 120,
    match: { includesAny: ["奶茶", "咖啡", "瑞幸", "星巴克", "茶", "甜品", "零食", "饮料"] },
    result: { category: "餐饮", subcategory: "零食" }
  },
  {
    id: "digital-service",
    description: "数字服务关键词归类为电器数码",
    enabled: true,
    priority: 120,
    match: {
      includesAny: ["MiniMax", "OpenAI", "Claude", "API", "服务器", "阿里云", "腾讯云", "软件", "会员", "订阅", "数码"]
    },
    result: { category: "电器数码", subcategory: "其它" }
  },
  {
    id: "train-travel",
    description: "火车高铁动车归类为火车出行",
    enabled: true,
    priority: 120,
    match: { includesAny: ["高铁", "火车", "动车"] },
    result: { category: "火车出行", subcategory: "其它" }
  },
  {
    id: "traffic-parking",
    description: "停车归类为交通停车费",
    enabled: true,
    priority: 120,
    match: { includesAny: ["停车"] },
    result: { category: "交通", subcategory: "停车费" }
  },
  {
    id: "traffic-charging",
    description: "充电归类为交通充电",
    enabled: true,
    priority: 120,
    match: { includesAny: ["充电"] },
    result: { category: "交通", subcategory: "充电" }
  },
  {
    id: "traffic-parts",
    description: "车配件归类为交通配件",
    enabled: true,
    priority: 120,
    match: { includesAny: ["车配件", "配件"] },
    result: { category: "交通", subcategory: "配件" }
  },
  {
    id: "traffic-taxi-transit",
    description: "地铁滴滴打车出行归类为交通停车费",
    enabled: true,
    priority: 100,
    match: { includesAny: ["地铁", "滴滴", "打车", "出行"] },
    result: { category: "交通", subcategory: "停车费" }
  },
  {
    id: "ecommerce-daily-goods",
    description: "电商平台默认归类为日用百货",
    enabled: true,
    priority: 80,
    match: { includesAny: ["淘宝", "天猫", "京东", "拼多多"] },
    result: { category: "日用百货", subcategory: "其它" }
  }
];

export const defaultSelectionRules: DefaultSelectionRule[] = [
  {
    id: "wang-yibo-yuebao-fee-unselected",
    description: "汪一波账户下余额宝收益发放费用默认不导出",
    enabled: true,
    priority: 1000,
    accounts: ["汪一波账户"],
    match: { includesAny: ["余额宝-收益发放费用"] },
    selected: false
  },
  {
    id: "dai-guanyu-yuebao-unselected",
    description: "戴冠宇账户下余额宝收益默认不导出，但不影响余额宝收益发放费用",
    enabled: true,
    priority: 900,
    accounts: ["戴冠宇账户"],
    match: { includesAny: ["余额宝", "收益发放"], excludesAny: ["余额宝-收益发放费用"] },
    selected: false
  },
  {
    id: "dai-guanyu-ride-hailing-unselected",
    description: "戴冠宇账户下滴滴打车费用默认不导出",
    enabled: true,
    priority: 800,
    accounts: ["戴冠宇账户"],
    match: { includesAny: ["滴滴", "打车"] },
    selected: false
  },
  {
    id: "dai-guanyu-public-transit-unselected",
    description: "戴冠宇账户下公交地铁费用默认不导出",
    enabled: true,
    priority: 800,
    accounts: ["戴冠宇账户"],
    match: { includesAny: ["公交", "地铁"] },
    selected: false
  },
  {
    id: "dai-guanyu-parking-unselected",
    description: "戴冠宇账户下停车费用默认不导出",
    enabled: true,
    priority: 800,
    accounts: ["戴冠宇账户"],
    match: { includesAny: ["停车", "停车费"] },
    selected: false
  },
  {
    id: "dai-guanyu-dining-unselected",
    description: "戴冠宇账户下餐饮费用默认不导出",
    enabled: true,
    priority: 700,
    accounts: ["戴冠宇账户"],
    match: { includesAny: ["餐饮", "餐饮美食"] },
    selected: false
  },
  {
    id: "dai-guanyu-adult-clothing-unselected",
    description: "戴冠宇账户下成人服饰费用默认不导出，宝宝婴儿服饰除外",
    enabled: true,
    priority: 700,
    accounts: ["戴冠宇账户"],
    match: {
      includesAny: ["服装", "衣服", "鞋", "裤", "t恤", "裙", "帽", "服饰", "装扮"],
      excludesAny: ["宝宝", "婴儿", "儿童", "新生儿", "幼儿", "童装", "宝宝衣", "婴儿衣", "儿童衣", "儿童服", "童鞋", "baby", "kids"]
    },
    selected: false
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

function matchCategoryRuleList(rules: CategoryRule[], value: Partial<Transaction> | string, sourceOverride?: ImportSource) {
  const text = typeof value === "string" ? normalizeRuleText(value) : getTransactionSearchText(value);
  if (!text) return null;

  const source = sourceOverride ?? (typeof value === "string" ? undefined : transactionSource(value));
  const rule = sortByPriority(rules).find((item) => item.enabled && matchesRule(text, item.match, source));
  if (!rule) return null;

  const validated = validateCategoryResult(rule.result.category, rule.result.subcategory);
  if (!validated) return null;

  return {
    ...validated,
    ruleId: rule.id,
    source
  };
}

export function matchCategoryRule(value: Partial<Transaction> | string, sourceOverride?: ImportSource): MatchedCategoryRule | null {
  const matched = matchCategoryRuleList(businessCategoryRules, value, sourceOverride);
  if (!matched) return null;

  logRuleMatch("category", matched.ruleId, matched.source);
  return {
    category: matched.category,
    subcategory: matched.subcategory,
    ruleId: matched.ruleId
  };
}

export function classifyByKeywordRule(value: Partial<Transaction> | string, sourceOverride?: ImportSource): CategoryResult | undefined {
  const matched = matchCategoryRuleList(keywordFallbackRules, value, sourceOverride);
  if (!matched) return undefined;

  return {
    category: matched.category,
    subcategory: matched.subcategory
  };
}

export function getDefaultSelection(transaction: Partial<Transaction>, account: string): DefaultSelectionResult {
  const text = getTransactionSearchText(transaction);
  if (!text) return { selected: true };

  const source = transactionSource(transaction);
  const rule = sortByPriority(defaultSelectionRules).find(
    (item) =>
      item.enabled &&
      (!item.accounts?.length || item.accounts.includes(account)) &&
      matchesRule(text, item.match, source)
  );

  if (!rule) return { selected: true };

  logRuleMatch("selection", rule.id, source);
  return {
    selected: rule.selected,
    ruleId: rule.id
  };
}

export function isYuEBaoFee(transaction: Partial<Transaction>) {
  return matchesRule(getTransactionSearchText(transaction), { includesAny: ["余额宝-收益发放费用"] }, transactionSource(transaction));
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
