import { describe, expect, test } from 'vitest';

import type { Line } from '../src/charts.ts';
import { parseGraph, renderGraph } from '../src/flow.ts';

function readText(lines: readonly Line[]): string[] {
  return lines.map(line => line.map(run => run.text).join(''));
}

describe('flow', () => {
  test('renderGraph_PlainChainWithBranch_DrawsTree', () => {
    expect(readText(renderGraph(parseGraph('plan -> build -> test\nplan -> docs', 'flow')))).toEqual([
      '◉ plan',
      '├─▶ build',
      '│   └─▶ test',
      '└─▶ docs'
    ]);
  });

  test('renderGraph_MermaidLabelsAndCycle_DrawsLabelsAndRepeatMark', () => {
    const source = 'flowchart TD\n  egg[Digitama] --> baby[Baby]\n  baby -->|grow| egg';
    expect(readText(renderGraph(parseGraph(source, 'mermaid')))).toEqual(['◉ Digitama', '└─▶ Baby', '    └─▶ ‹grow› ↺ Digitama']);
  });

  test('renderGraph_MermaidStyleLines_DrawsNothing', () => {
    expect(renderGraph(parseGraph('graph LR\nstyle A fill:#fff\nclassDef x fill:#000', 'mermaid'))).toEqual([]);
  });
});
