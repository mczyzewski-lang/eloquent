import type { Filter, FilterOp } from "./types";

function isOpObject(v: unknown): v is { gte?: unknown; lte?: unknown; gt?: unknown; lt?: unknown; in?: unknown[]; neq?: unknown } {
  return typeof v === "object" && v !== null && !Array.isArray(v) && ["gte", "lte", "gt", "lt", "in", "neq"].some((k) => k in (v as object));
}

function cmp(a: unknown, b: unknown): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

export function matchesFilter<T>(row: T, filter: Filter<T> | undefined): boolean {
  if (!filter) return true;
  for (const [key, cond] of Object.entries(filter) as [keyof T, FilterOp<unknown>][]) {
    if (cond === undefined) continue;
    const value = row[key] as unknown;
    if (isOpObject(cond)) {
      if (cond.gte !== undefined && (value == null || cmp(value, cond.gte) < 0)) return false;
      if (cond.gt !== undefined && (value == null || cmp(value, cond.gt) <= 0)) return false;
      if (cond.lte !== undefined && (value == null || cmp(value, cond.lte) > 0)) return false;
      if (cond.lt !== undefined && (value == null || cmp(value, cond.lt) >= 0)) return false;
      if (cond.in !== undefined && !cond.in.includes(value)) return false;
      if ("neq" in cond && value === cond.neq) return false;
    } else if (cond === null) {
      if (value !== null && value !== undefined) return false;
    } else if (value !== cond) return false;
  }
  return true;
}
