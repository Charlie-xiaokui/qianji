import type { Transaction } from "@/lib/types";

export const mockTransactions: Transaction[] = [
  {
    id: "mock-1",
    platform: "wechat",
    merchant: "蜜雪冰城",
    amount: 18,
    datetime: "2026-04-05 12:33:00",
    type: "expense",
    category: "餐饮",
    subcategory: "饮品",
    selected: true,
    sourceFile: "wechat-01.png"
  },
  {
    id: "mock-2",
    platform: "alipay",
    merchant: "滴滴出行",
    amount: 32.5,
    datetime: "2026-04-05 19:08:00",
    type: "expense",
    category: "交通",
    subcategory: "打车",
    selected: true,
    sourceFile: "alipay-01.png"
  },
  {
    id: "mock-3",
    platform: "wechat",
    merchant: "工资",
    amount: 12800,
    datetime: "2026-04-01 09:00:00",
    type: "income",
    category: "收入",
    subcategory: "工资",
    selected: true,
    sourceFile: "wechat-02.png"
  },
  {
    id: "mock-4",
    platform: "wechat",
    merchant: "蜜雪冰城",
    amount: 18,
    datetime: "2026-04-05 12:33:00",
    type: "expense",
    category: "餐饮",
    subcategory: "饮品",
    possibleDuplicate: true,
    selected: true,
    sourceFile: "wechat-duplicate.png"
  }
];
