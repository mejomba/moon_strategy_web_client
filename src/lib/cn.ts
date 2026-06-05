/** Join truthy class names. Tiny `clsx` stand-in to avoid a dependency. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
