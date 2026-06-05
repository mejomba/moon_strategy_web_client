"use client";

import { useMemo, useState } from "react";

import { cn } from "@/lib/cn";
import { StrategyBuilder } from "@/components/builder/StrategyBuilder";
import { GraphCanvas } from "@/components/builder/GraphCanvas";
import {
  compileToGraph,
  newCondition,
  newIndicator,
  type StrategyBuilderModel,
} from "@/lib/strategy/builder";

type Mode = "guided" | "canvas";

/** Seed graph for the canvas: a runnable SMA-cross example. */
function seedGraph() {
  const fast = { ...newIndicator("sma"), id: "fast", period: 10 };
  const slow = { ...newIndicator("sma"), id: "slow", period: 30 };
  const model: StrategyBuilderModel = {
    indicators: [fast, slow],
    direction: "long",
    entry: {
      combinator: "and",
      conditions: [{ ...newCondition("fast", "slow"), comparator: "crosses_above" }],
    },
    exit: {
      combinator: "and",
      conditions: [{ ...newCondition("fast", "slow"), comparator: "crosses_below" }],
    },
  };
  return compileToGraph(model);
}

export function BuilderTabs() {
  const [mode, setMode] = useState<Mode>("guided");
  const initialGraph = useMemo(() => seedGraph(), []);

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-800">
        {(["guided", "canvas"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors",
              mode === m
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400",
            )}
          >
            {m === "guided" ? "Guided" : "Canvas"}
          </button>
        ))}
      </div>

      {mode === "guided" ? (
        <StrategyBuilder />
      ) : (
        <GraphCanvas initialGraph={initialGraph} />
      )}
    </div>
  );
}
