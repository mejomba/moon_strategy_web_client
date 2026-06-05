/**
 * Legal disclaimer surfaced in trading-related flows (CLAUDE.md §3 rule 6, §6).
 *
 * `variant="banner"` is the compact inline notice shown on strategy/backtest/
 * trading screens; `variant="footer"` is the persistent app-wide footer line.
 */

const TEXT =
  "Strategy Tester is a research and simulation tool. Backtest and paper-trading " +
  "results are hypothetical, do not guarantee future performance, and are not " +
  "financial advice. Trading carries substantial risk of loss. You are solely " +
  "responsible for your decisions. This platform never holds, custodies, or " +
  "transfers your funds and never requests withdrawal access to your accounts.";

export function LegalDisclaimer({
  variant = "banner",
}: {
  variant?: "banner" | "footer";
}) {
  if (variant === "footer") {
    return (
      <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-500">{TEXT}</p>
    );
  }

  return (
    <div
      role="note"
      className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300"
    >
      <span className="font-semibold">Risk disclaimer. </span>
      {TEXT}
    </div>
  );
}
