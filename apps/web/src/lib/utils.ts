import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return inputs.filter(Boolean).join(" ");
}

export function formatNumber(n: number): string {
  return n.toLocaleString("ja-JP");
}

export function formatCurrency(n: number): string {
  return `¥${Math.round(n).toLocaleString("ja-JP")}`;
}

export function calcChange(current: number, prev: number): string {
  if (prev === 0) return "—";
  const pct = ((current - prev) / prev) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}
