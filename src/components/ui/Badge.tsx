import { cn } from "@/lib/cn";

type Tone = "neutral" | "info" | "success" | "warning" | "danger";

const TONES: Record<Tone, string> = {
  neutral: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  info: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  danger: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

/** Map a backtest/strategy status string to a badge tone. */
export function statusTone(status: string): Tone {
  switch (status) {
    case "completed":
    case "active":
      return "success";
    case "running":
    case "pending":
      return "info";
    case "failed":
      return "danger";
    case "archived":
      return "neutral";
    default:
      return "neutral";
  }
}
