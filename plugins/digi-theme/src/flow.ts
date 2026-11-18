import type { Line } from './charts.ts';
import { pickSeriesColor, VIBES } from './palette.ts';

export type Edge = { from: string; to: string; label?: string };
export type Graph = { nodes: Map<string, string>; edges: Edge[] };

const PLAIN_ARROW = /\s*(?:-->|->|→|⟶|=>)\s*/u;
const MERMAID_ARROW = /\s*(?:-->|---|==>|-\.->|-\.-)\s*(?:\|(?<label>[^|]*)\|\s*)?/u;
const MERMAID_NODE = /^(?<id>[\w-]+)\s*(?:[[({>]+\s*"?(?<label>.*?)"?\s*[\])}]+)?$/u;
const MERMAID_SKIPPED = /^(?:graph|flowchart|subgraph|end\b|style\b|classDef\b|class\b|click\b|linkStyle\b|%%)/u;
const MAX_NODES = 200;
const PARTS_PER_STEP = 2;

const addNode = (graph: Graph, id: string, label?: string): void => {
  if (!graph.nodes.has(id) || label) graph.nodes.set(id, label || graph.nodes.get(id) || id);
};

const parsePlainLine = (graph: Graph, line: string): void => {
  const names = line.split(PLAIN_ARROW).map(name => name.trim()).filter(Boolean);
  names.forEach(name => addNode(graph, name));
  names.slice(1).forEach((target, index) => graph.edges.push({ from: names[index] ?? target, to: target }));
};

const parseMermaidLine = (graph: Graph, line: string): void => {
  const parts = line.split(MERMAID_ARROW);
  const ids: string[] = [];
  const labels: (string | undefined)[] = [];
  parts.forEach((part, index) => {
    if (index % PARTS_PER_STEP === 1) {
      labels.push(part?.trim() || undefined);
      return;
    }
    const node = MERMAID_NODE.exec((part ?? '').trim());
    if (!node?.[1]) return;
    addNode(graph, node[1], node[2]?.trim());
    ids.push(node[1]);
  });
  ids.slice(1).forEach((target, index) => {
    const label = labels[index];
    graph.edges.push({ from: ids[index] ?? target, to: target, ...(label ? { label } : {}) });
  });
};

export const parseGraph = (source: string, dialect: 'flow' | 'mermaid'): Graph => {
  const graph: Graph = { nodes: new Map(), edges: [] };
  source
    .split('\n')
    .map(line => line.trim().replace(/;$/u, ''))
    .filter(line => line && !(dialect === 'mermaid' && MERMAID_SKIPPED.test(line)))
    .forEach(line => (dialect === 'mermaid' ? parseMermaidLine(graph, line) : parsePlainLine(graph, line)));
  return graph;
};

export const renderGraph = (graph: Graph): Line[] => {
  const children = new Map<string, Edge[]>();
  graph.edges.forEach(edge => children.set(edge.from, [...(children.get(edge.from) ?? []), edge]));
  const targets = new Set(graph.edges.map(edge => edge.to));
  const order = [...graph.nodes.keys()].slice(0, MAX_NODES);
  const visited = new Set<string>();
  const lines: Line[] = [];
  const visit = (id: string, prefix: string, connector: string, depth: number, label?: string) => {
    const name = graph.nodes.get(id) ?? id;
    const isRepeat = visited.has(id);
    lines.push([
      { text: prefix, color: VIBES.mountain },
      { text: connector, color: VIBES.mountain },
      ...(label ? [{ text: `‹${label}› `, dim: true }] : []),
      isRepeat ? { text: `↺ ${name}`, dim: true } : { text: depth === 0 ? `◉ ${name}` : name, color: pickSeriesColor(depth), bold: depth === 0 }
    ]);
    if (isRepeat) return;
    visited.add(id);
    const edges = children.get(id) ?? [];
    const childPrefix = depth === 0 ? '' : prefix + (connector.startsWith('└') ? '    ' : '│   ');
    edges.forEach((edge, index) => visit(edge.to, childPrefix, index === edges.length - 1 ? '└─▶ ' : '├─▶ ', depth + 1, edge.label));
  };
  const roots = order.filter(id => !targets.has(id));
  [...roots, ...order].forEach(id => {
    if (!visited.has(id)) visit(id, '', '', 0);
  });
  return lines;
};
