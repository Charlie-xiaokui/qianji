import type { ExtractedTransaction, TransactionType } from "@/lib/types";

export type BillSource = "alipay" | "wechat";

export type ImporterResult = {
  source: BillSource;
  transactions: ExtractedTransaction[];
};

export type CsvRow = Record<string, string>;

export type ParsedCsvTable = {
  headers: string[];
  rows: CsvRow[];
  table: string;
};

export type ParsedBillRow = {
  datetime: string;
  merchant: string;
  amount: number;
  type: TransactionType;
  category?: string;
  subcategory?: string;
  note?: string;
};
