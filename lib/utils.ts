import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAmount(amount: number) {
  return amount.toFixed(2);
}

export function platformLabel(platform: "wechat" | "alipay") {
  return platform === "wechat" ? "微信" : "支付宝";
}

export function normalizeDatetime(value: string) {
  const date = new Date(value.replace(/-/g, "/"));
  if (Number.isNaN(date.getTime())) return value;

  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:00`;
}

export function toQianjiDate(value: string) {
  const normalized = normalizeDatetime(value);
  const [date] = normalized.split(" ");
  return date.replaceAll("-", "/");
}
