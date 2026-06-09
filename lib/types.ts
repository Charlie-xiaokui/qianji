export type Platform = "wechat" | "alipay";
export type TransactionType = "income" | "expense";

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
  "餐饮": ["早餐", "午餐", "晚餐", "饮品", "外卖"],
  "交通": ["打车", "公交", "地铁"],
  "转账": ["转出"],
  "购物": ["日用品", "电商"],
  "娱乐": ["游戏", "电影"],
  "医疗": ["药品", "医院"],
  "住房": ["房租", "水电"],
  "教育": ["课程", "书籍"],
  "收入": ["工资", "奖金", "转账收入", "红包收入", "理财收益"],
  "其它": ["其它"]
};
