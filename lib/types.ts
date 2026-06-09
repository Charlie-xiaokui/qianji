export type Platform = "wechat" | "alipay";
export type TransactionType = "income" | "expense" | "transfer";

export interface Transaction {
  id: string;
  platform: Platform;
  merchant: string;
  amount: number;
  datetime: string;
  type: TransactionType;
  category: string;
  subcategory: string;
  possibleDuplicate?: boolean;
  selected?: boolean;
  note?: string;
  sourceFile?: string;
}

export interface ExtractedTransaction {
  platform: Platform;
  merchant: string;
  amount: number;
  datetime: string;
  type: TransactionType;
}

export interface OcrTransaction {
  merchant: string;
  amount: number;
  date: string;
  account: string;
  type: TransactionType;
}

export interface CategoryResult {
  category: string;
  subcategory: string;
}

export interface MerchantCategoryCache {
  merchant: string;
  category: string;
  subcategory: string;
  updatedAt: string;
}

export const categories: Record<string, string[]> = {
  "餐饮": ["三餐", "零食", "烟酒"],
  "日用百货": ["其它"],
  "营养保健": ["其它"],
  "育儿服务": ["其它"],
  "婴儿用品": ["其它"],
  "婴儿食品": ["其它"],
  "厨房电器": ["其它"],
  "服饰装扮": ["其它"],
  "母婴用品": ["其它"],
  "转出": ["其它"],
  "交通": ["停车费", "充电", "配件"],
  "学习": ["其它"],
  "运动": ["其它"],
  "旅行": ["其它"],
  "娱乐": ["其它"],
  "医疗": ["产检", "药品", "就诊", "疫苗", "住院"],
  "电器数码": ["其它"],
  "请客送礼": ["其它"],
  "爱车养车": ["其它"],
  "文化休闲": ["其它"],
  "住房": ["日用品", "水电煤", "房贷", "房租", "家具", "家电", "厨房"],
  "收入": ["红包收入", "理财收益", "收红包", "结婚收礼", "寿辰收礼", "乔迁收礼", "其它"],
  "其它": ["其它"]
};
