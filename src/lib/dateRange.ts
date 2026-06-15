/** Helpers for working with `YYYY-MM-DD` date strings (lexicographically ordered). */

/** The date portion of an ISO datetime, or undefined. */
export function dateOnly(iso: string | null | undefined): string | undefined {
  return iso ? iso.slice(0, 10) : undefined;
}

/** Clamp a `YYYY-MM-DD` value into the optional [min, max] coverage window. */
export function clampDate(value: string, min?: string, max?: string): string {
  if (min && value < min) return min;
  if (max && value > max) return max;
  return value;
}
