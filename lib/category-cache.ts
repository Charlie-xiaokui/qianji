"use client";

import { classifyByKeywordRule, isFallbackCategory, normalizeCategoryResult } from "@/lib/category-rules";
import type { CategoryResult, MerchantCategoryCache } from "@/lib/types";

const databaseName = "qianji_screenshot_importer";
const storeName = "merchant_category_cache";
const databaseVersion = 1;

function normalizeMerchant(merchant: string) {
  return merchant.trim();
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(storeName)) {
        database.createObjectStore(storeName, { keyPath: "merchant" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB 打开失败"));
  });
}

async function withStore<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await openDatabase();

  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = operation(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB 操作失败"));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("IndexedDB 事务失败"));
    };
  });
}

export async function getMerchantCategory(merchant: string) {
  const key = normalizeMerchant(merchant);
  if (!key) return undefined;
  return withStore<MerchantCategoryCache | undefined>("readonly", (store) => store.get(key));
}

export async function setMerchantCategory(record: Omit<MerchantCategoryCache, "updatedAt"> & { updatedAt?: string }) {
  const merchant = normalizeMerchant(record.merchant);
  if (!merchant) throw new Error("商户名称不能为空");

  const nextRecord: MerchantCategoryCache = {
    merchant,
    category: record.category || "其它",
    subcategory: record.subcategory || "其它",
    updatedAt: record.updatedAt ?? new Date().toISOString()
  };

  await withStore<IDBValidKey>("readwrite", (store) => store.put(nextRecord));
  return nextRecord;
}

export async function clearMerchantCategoryCache() {
  await withStore<undefined>("readwrite", (store) => store.clear());
}

function validateCategory(payload: unknown, merchant: string): CategoryResult {
  return normalizeCategoryResult(payload, merchant);
}

export async function classifyWithCache(merchant: string, fallback?: CategoryResult) {
  const ruleCategory = classifyByKeywordRule(merchant);
  if (ruleCategory) {
    console.debug(`[classify] rule hit: ${merchant} ${ruleCategory.category}/${ruleCategory.subcategory}`);
    return ruleCategory;
  }

  const cached = await getMerchantCategory(merchant);
  if (cached) {
    console.debug(`[classify] cache hit: ${merchant}`);
    return {
      category: cached.category,
      subcategory: cached.subcategory
    };
  }

  console.debug(`[classify] cache miss: ${merchant}`);

  if (fallback?.category && fallback?.subcategory && !isFallbackCategory(fallback)) {
    return setMerchantCategory({
      merchant,
      category: fallback.category,
      subcategory: fallback.subcategory
    });
  }

  const response = await fetch("/api/classify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ merchant })
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => undefined)) as { error?: string } | undefined;
    console.error(`[classify] api fail: ${merchant} ${payload?.error || response.statusText}`);
    throw new Error(payload?.error || "分类失败");
  }

  const category = validateCategory(await response.json(), merchant);
  console.debug(`[classify] api success: ${merchant} ${category.category}/${category.subcategory}`);
  return setMerchantCategory({
    merchant,
    category: category.category,
    subcategory: category.subcategory
  });
}

export async function classifyWithCacheDetails(merchant: string, fallback?: CategoryResult) {
  const ruleCategory = classifyByKeywordRule(merchant);
  if (ruleCategory) {
    console.debug(`[classify] rule hit: ${merchant} ${ruleCategory.category}/${ruleCategory.subcategory}`);
    return {
      ...ruleCategory,
      source: "rule" as const
    };
  }

  const cached = await getMerchantCategory(merchant);
  if (cached) {
    console.debug(`[classify] cache hit: ${merchant}`);
    return {
      category: cached.category,
      subcategory: cached.subcategory,
      source: "cache" as const
    };
  }

  console.debug(`[classify] cache miss: ${merchant}`);

  if (fallback?.category && fallback?.subcategory && !isFallbackCategory(fallback)) {
    const category = await setMerchantCategory({
      merchant,
      category: fallback.category,
      subcategory: fallback.subcategory
    });
    return {
      category: category.category,
      subcategory: category.subcategory,
      source: "fallback" as const
    };
  }

  const response = await fetch("/api/classify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ merchant })
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => undefined)) as { error?: string } | undefined;
    console.error(`[classify] api fail: ${merchant} ${payload?.error || response.statusText}`);
    throw new Error(payload?.error || "分类失败");
  }

  const category = validateCategory(await response.json(), merchant);
  console.debug(`[classify] api success: ${merchant} ${category.category}/${category.subcategory}`);
  const saved = await setMerchantCategory({
    merchant,
    category: category.category,
    subcategory: category.subcategory
  });

  return {
    category: saved.category,
    subcategory: saved.subcategory,
    source: "api" as const
  };
}
