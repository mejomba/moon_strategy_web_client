/**
 * Display formatting helpers. Backend decimals arrive as strings, so these
 * tolerate `string | number | null` and degrade gracefully to an em dash.
 */

const DASH = "—";

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Signed percentage, e.g. "+12.34%". */
export function formatPercent(
  value: string | number | null | undefined,
  digits = 2,
): string {
  const n = toNumber(value);
  if (n === null) return DASH;
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

/** Unsigned magnitude percentage, e.g. "12.34%" (for drawdown, win rate). */
export function formatPercentPlain(
  value: string | number | null | undefined,
  digits = 2,
): string {
  const n = toNumber(value);
  return n === null ? DASH : `${n.toFixed(digits)}%`;
}

export function formatNumber(
  value: string | number | null | undefined,
  digits = 2,
): string {
  const n = toNumber(value);
  return n === null
    ? DASH
    : n.toLocaleString("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });
}

export function formatCurrency(
  value: string | number | null | undefined,
  digits = 2,
): string {
  const n = toNumber(value);
  return n === null ? DASH : `$${formatNumber(n, digits)}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return DASH;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? DASH : d.toLocaleDateString("en-US");
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return DASH;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? DASH : d.toLocaleString("en-US");
}

/** Sign class for colouring a metric: positive / negative / neutral. */
export function signClass(value: string | number | null | undefined): string {
  const n = toNumber(value);
  if (n === null || n === 0) return "text-zinc-500";
  return n > 0
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-rose-600 dark:text-rose-400";
}
