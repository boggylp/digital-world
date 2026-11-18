import { parseGraph, renderGraph } from '../../plugins/digi-theme/src/flow.ts';
import { readText } from './read-text.ts';

const drawGraph = (source: string, dialect: 'flow' | 'mermaid'): string[] => readText(renderGraph(parseGraph(source, dialect)));

describe('flow', () => {
  it('renderGraph_PlainChainWithBranch_DrawsTree', () => {
    expect(drawGraph('plan -> build -> test\nplan -> docs', 'flow')).toStrictEqual([
      '◉ plan',
      '├─▶ build',
      '│   └─▶ test',
      '└─▶ docs'
    ]);
  });

  it('renderGraph_MermaidLabelsAndCycle_DrawsLabelsAndRepeatMark', () => {
    const source = 'flowchart TD\n  egg[Digitama] --> baby[Baby]\n  baby -->|grow| egg';
    expect(drawGraph(source, 'mermaid')).toStrictEqual(['◉ Digitama', '└─▶ Baby', '    └─▶ ‹grow› ↺ Digitama']);
  });

  it('renderGraph_MermaidStyleLines_DrawsNothing', () => {
    expect(renderGraph(parseGraph('graph LR\nstyle A fill:#fff\nclassDef x fill:#000', 'mermaid'))).toStrictEqual([]);
  });
});
