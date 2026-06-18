"use client";

import "@xyflow/react/dist/style.css";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addEdge,
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";

import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { ErrorState } from "@/components/ui/Feedback";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import { createStrategy, updateStrategy } from "@/lib/api/strategies";
import { createEmptyModel } from "@/lib/strategy/serialize";
import { validateGraph } from "@/lib/strategy/graphValidate";
import type { GraphNodeType, LogicGraph, StrategyStatus } from "@/lib/strategy/schema";

/** Node data carried by each React Flow node. */
interface NodeData extends Record<string, unknown> {
  category: GraphNodeType;
  op: string;
  params: Record<string, unknown>;
  label: string;
}
type FlowNode = Node<NodeData>;

const CATEGORY_TONE: Record<GraphNodeType, string> = {
  indicator: "border-sky-400 bg-sky-50 dark:bg-sky-950/50",
  condition: "border-violet-400 bg-violet-50 dark:bg-violet-950/50",
  logic: "border-amber-400 bg-amber-50 dark:bg-amber-950/50",
  signal: "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/50",
};

/** Palette of nodes that can be dropped onto the canvas. */
const PALETTE: {
  category: GraphNodeType;
  op: string;
  label: string;
  params: Record<string, unknown>;
}[] = [
  { category: "indicator", op: "price", label: "Price", params: { source: "close" } },
  {
    category: "indicator",
    op: "sma",
    label: "SMA",
    params: { period: 20, source: "close" },
  },
  {
    category: "indicator",
    op: "ema",
    label: "EMA",
    params: { period: 20, source: "close" },
  },
  {
    category: "indicator",
    op: "rsi",
    label: "RSI",
    params: { period: 14, source: "close" },
  },
  { category: "indicator", op: "constant", label: "Constant", params: { value: 100 } },
  { category: "condition", op: "greater_than", label: "A > B", params: {} },
  { category: "condition", op: "less_than", label: "A < B", params: {} },
  { category: "condition", op: "crosses_above", label: "A crosses above B", params: {} },
  { category: "condition", op: "crosses_below", label: "A crosses below B", params: {} },
  { category: "logic", op: "and", label: "AND", params: {} },
  { category: "logic", op: "or", label: "OR", params: {} },
  { category: "logic", op: "not", label: "NOT", params: {} },
  { category: "signal", op: "enter_long", label: "Enter long", params: {} },
  { category: "signal", op: "enter_short", label: "Enter short", params: {} },
  { category: "signal", op: "exit", label: "Exit", params: {} },
];

const HANDLE = "!h-3 !w-3 !border !border-white !bg-zinc-500";

/** Custom node renderer with category-specific input/output ports. */
function FlowNodeView({ data, selected }: NodeProps<FlowNode>) {
  const ring = selected ? "ring-2 ring-zinc-900 dark:ring-zinc-100" : "";
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-xs shadow-sm ${CATEGORY_TONE[data.category]} ${ring}`}
    >
      {data.category === "condition" && (
        <>
          <Handle
            id="a"
            type="target"
            position={Position.Left}
            style={{ top: "33%" }}
            className={HANDLE}
          />
          <Handle
            id="b"
            type="target"
            position={Position.Left}
            style={{ top: "67%" }}
            className={HANDLE}
          />
        </>
      )}
      {data.category === "logic" && (
        <Handle type="target" position={Position.Left} className={HANDLE} />
      )}
      {data.category === "signal" && (
        <Handle id="in" type="target" position={Position.Left} className={HANDLE} />
      )}

      <div className="font-semibold text-zinc-800 dark:text-zinc-100">{data.label}</div>
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">
        {data.category}
      </div>

      {data.category !== "signal" && (
        <Handle type="source" position={Position.Right} className={HANDLE} />
      )}
    </div>
  );
}

const nodeTypes = { card: FlowNodeView };

function paletteLabel(op: string, params: Record<string, unknown>): string {
  const entry = PALETTE.find((p) => p.op === op);
  const base = entry?.label ?? op;
  if (op === "constant") return `${params.value ?? 0}`;
  if ("period" in params) return `${op.toUpperCase()}(${params.period})`;
  return base;
}

function toFlow(graph: LogicGraph): { nodes: FlowNode[]; edges: Edge[] } {
  const nodes: FlowNode[] = graph.nodes.map((n) => ({
    id: n.id,
    type: "card",
    position: n.position ?? { x: 0, y: 0 },
    data: {
      category: n.type,
      op: n.op,
      params: { ...n.params },
      label: n.label ?? paletteLabel(n.op, n.params),
    },
  }));
  const edges: Edge[] = graph.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    targetHandle: e.targetPort ?? null,
  }));
  return { nodes, edges };
}

// Spread compiler-style positions onto a readable grid by category.
const COLUMN: Record<GraphNodeType, number> = {
  indicator: 0,
  condition: 280,
  logic: 540,
  signal: 800,
};

let nodeSeq = 0;
const newNodeId = () => `n_${Date.now().toString(36)}_${nodeSeq++}`;

function GraphCanvasInner({
  initialGraph,
  initialName,
  initialDescription,
  initialStatus,
  strategyId,
}: {
  initialGraph: LogicGraph;
  initialName: string;
  initialDescription: string;
  initialStatus: StrategyStatus;
  strategyId?: number;
}) {
  const router = useRouter();
  const { screenToFlowPosition } = useReactFlow();
  const isEdit = strategyId !== undefined;
  const seeded = useMemo(() => toFlow(initialGraph), [initialGraph]);

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(seeded.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(seeded.edges);
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onConnect = useCallback(
    (c: Connection) => setEdges((eds) => addEdge({ ...c, id: newNodeId() }, eds)),
    [setEdges],
  );

  const addNode = useCallback(
    (op: string, position?: { x: number; y: number }) => {
      const bp = PALETTE.find((p) => p.op === op);
      if (!bp) return;
      const node: FlowNode = {
        id: newNodeId(),
        type: "card",
        position: position ?? { x: COLUMN[bp.category], y: 40 + nodes.length * 20 },
        data: {
          category: bp.category,
          op: bp.op,
          params: { ...bp.params },
          label: bp.label,
        },
      };
      setNodes((ns) => [...ns, node]);
    },
    [nodes.length, setNodes],
  );

  // Drag a palette item onto the canvas to drop a node at the cursor.
  const onDragStart = (e: React.DragEvent, op: string) => {
    e.dataTransfer.setData("application/strategy-op", op);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const op = e.dataTransfer.getData("application/strategy-op");
      if (!op) return;
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      addNode(op, position);
    },
    [screenToFlowPosition, addNode],
  );

  const graph: LogicGraph = useMemo(
    () => ({
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.data.category,
        op: n.data.op,
        params: n.data.params as LogicGraph["nodes"][number]["params"],
        position: n.position,
        label: n.data.label,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        targetPort: e.targetHandle ?? undefined,
      })),
    }),
    [nodes, edges],
  );

  const problems = useMemo(() => validateGraph(graph), [graph]);
  const selected = nodes.find((n) => n.id === selectedId) ?? null;

  function updateParam(key: string, value: unknown) {
    setNodes((ns) =>
      ns.map((n) => {
        if (n.id !== selectedId) return n;
        const params = { ...n.data.params, [key]: value };
        return {
          ...n,
          data: { ...n.data, params, label: paletteLabel(n.data.op, params) },
        };
      }),
    );
  }
  function deleteSelected() {
    if (!selectedId) return;
    setNodes((ns) => ns.filter((n) => n.id !== selectedId));
    setEdges((es) =>
      es.filter((e) => e.source !== selectedId && e.target !== selectedId),
    );
    setSelectedId(null);
  }

  async function handleSave() {
    setError(null);
    if (!name.trim()) {
      setError("Give your strategy a name.");
      return;
    }
    if (problems.length > 0) {
      setError("Fix the graph problems before saving.");
      return;
    }
    setSaving(true);
    try {
      const strategy = {
        ...createEmptyModel("graph"),
        name,
        description,
        status: initialStatus,
        graph,
      };
      const saved = isEdit
        ? await updateStrategy(strategyId!, strategy)
        : await createStrategy(strategy);
      router.push(`/strategies/${saved.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save strategy.");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" htmlFor="cname">
            <Input
              id="cname"
              value={name}
              maxLength={120}
              placeholder="e.g. RSI + trend filter"
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Description" htmlFor="cdesc">
            <Input
              id="cdesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[12rem_1fr_16rem]">
        <Card className="h-fit">
          <CardHeader title="Add block" subtitle="Drag onto the canvas, or click" />
          <CardBody className="space-y-1">
            {PALETTE.map((p) => (
              <button
                key={p.op}
                type="button"
                draggable
                onDragStart={(e) => onDragStart(e, p.op)}
                onClick={() => addNode(p.op)}
                title="Drag onto the canvas or click to add"
                className={`w-full cursor-grab rounded-md border px-2 py-1 text-left text-xs active:cursor-grabbing ${CATEGORY_TONE[p.category]}`}
              >
                {p.label}
              </button>
            ))}
          </CardBody>
        </Card>

        <div
          className="h-[32rem] overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800"
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, n) => setSelectedId(n.id)}
            onPaneClick={() => setSelectedId(null)}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>

        <Card className="h-fit">
          <CardHeader title={selected ? "Edit block" : "Properties"} />
          <CardBody className="space-y-3">
            {!selected && (
              <p className="text-xs text-zinc-500">
                Click a block to edit it. Drag from a right port to a left port to
                connect.
              </p>
            )}
            {selected && (
              <NodeInspector
                node={selected}
                onParam={updateParam}
                onDelete={deleteSelected}
              />
            )}
          </CardBody>
        </Card>
      </div>

      {problems.length > 0 ? (
        <ErrorState message={problems.join(" ")} />
      ) : (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">Graph is valid ✓</p>
      )}

      <LegalDisclaimer />
      {error && <ErrorState message={error} />}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Save changes" : "Save strategy"}
        </Button>
      </div>
    </div>
  );
}

function NodeInspector({
  node,
  onParam,
  onDelete,
}: {
  node: FlowNode;
  onParam: (key: string, value: unknown) => void;
  onDelete: () => void;
}) {
  const { category, op, params } = node.data;
  const showPeriod = op === "sma" || op === "ema" || op === "rsi";
  const showSource = category === "indicator" && op !== "constant";

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">
        {category} · {op}
      </p>
      {showPeriod && (
        <Field label="Period" htmlFor="np">
          <Input
            id="np"
            type="number"
            min={1}
            value={Number(params.period ?? 20)}
            onChange={(e) => onParam("period", Number(e.target.value))}
          />
        </Field>
      )}
      {showSource && (
        <Field label="Source" htmlFor="ns">
          <Select
            id="ns"
            value={String(params.source ?? "close")}
            onChange={(e) => onParam("source", e.target.value)}
          >
            {["open", "high", "low", "close"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {op === "constant" && (
        <Field label="Value" htmlFor="nv">
          <Input
            id="nv"
            type="number"
            step="any"
            value={Number(params.value ?? 0)}
            onChange={(e) => onParam("value", Number(e.target.value))}
          />
        </Field>
      )}
      <Button variant="danger" size="sm" onClick={onDelete}>
        Delete block
      </Button>
    </div>
  );
}

export function GraphCanvas(props: {
  initialGraph: LogicGraph;
  initialName?: string;
  initialDescription?: string;
  initialStatus?: StrategyStatus;
  strategyId?: number;
}) {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner
        initialGraph={props.initialGraph}
        initialName={props.initialName ?? ""}
        initialDescription={props.initialDescription ?? ""}
        initialStatus={props.initialStatus ?? "draft"}
        strategyId={props.strategyId}
      />
    </ReactFlowProvider>
  );
}
