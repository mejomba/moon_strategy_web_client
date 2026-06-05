"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Feedback";
import { cn } from "@/lib/cn";
import { emptyGraph, type GraphNode, type LogicGraph } from "@/lib/strategy/schema";
import {
  NODE_CATALOG,
  NODE_TYPE_TONE,
  type NodeBlueprint,
} from "@/components/builder/nodeCatalog";

let counter = 0;
const nextId = () => `node_${++counter}`;

/**
 * Phase 2 skeleton for the no-code visual builder. It edits a {@link LogicGraph}
 * — the Phase 2 face of the strategy-JSON source of truth — by adding nodes from
 * the catalog and previews the live JSON. Wiring/canvas layout and the
 * graph→engine/MQL5 translators are intentionally out of scope for this phase.
 */
export function BuilderCanvas() {
  const [graph, setGraph] = useState<LogicGraph>(emptyGraph());

  function addNode(bp: NodeBlueprint) {
    const node: GraphNode = {
      id: nextId(),
      type: bp.type,
      op: bp.op,
      params: { ...bp.defaults },
      position: { x: 0, y: graph.nodes.length },
      label: bp.label,
    };
    setGraph((g) => ({ ...g, nodes: [...g.nodes, node] }));
  }

  function removeNode(id: string) {
    setGraph((g) => ({
      nodes: g.nodes.filter((n) => n.id !== id),
      edges: g.edges.filter((e) => e.source !== id && e.target !== id),
    }));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
      <Card className="h-fit">
        <CardHeader title="Blocks" subtitle="Click to add" />
        <CardBody className="space-y-2">
          {NODE_CATALOG.map((bp) => (
            <button
              key={bp.op}
              type="button"
              onClick={() => addNode(bp)}
              className={cn(
                "w-full rounded-lg border px-3 py-2 text-left text-sm transition hover:brightness-95",
                NODE_TYPE_TONE[bp.type],
              )}
            >
              <span className="font-medium">{bp.label}</span>
              <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                {bp.description}
              </span>
            </button>
          ))}
        </CardBody>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader
            title="Canvas"
            subtitle="Phase 2 preview — node wiring is not implemented yet"
            action={
              graph.nodes.length > 0 ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setGraph(emptyGraph())}
                >
                  Clear
                </Button>
              ) : undefined
            }
          />
          <CardBody>
            {graph.nodes.length === 0 ? (
              <EmptyState
                title="Empty canvas"
                description="Add blocks from the left to start sketching the strategy logic graph."
              />
            ) : (
              <ul className="space-y-2">
                {graph.nodes.map((n) => (
                  <li
                    key={n.id}
                    className={cn(
                      "flex items-center justify-between rounded-lg border px-3 py-2",
                      NODE_TYPE_TONE[n.type],
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <Badge tone="neutral">{n.type}</Badge>
                      <span className="font-medium">{n.label ?? n.op}</span>
                      {Object.keys(n.params).length > 0 && (
                        <span className="text-xs text-zinc-500">
                          {JSON.stringify(n.params)}
                        </span>
                      )}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => removeNode(n.id)}>
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Strategy-JSON" subtitle="Live logic-graph output" />
          <CardBody>
            <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-4 text-xs text-zinc-100">
              {JSON.stringify(graph, null, 2)}
            </pre>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
