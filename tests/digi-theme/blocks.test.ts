

import { splitBlocks } from '../../plugins/digi-theme/src/blocks.ts';

describe('splitBlocks prose', () => {
  it('splitBlocks_ProseOnly_ReturnsOneMarkdownBlock', () => {
    expect(splitBlocks('hello\n\n- one\n- two')).toStrictEqual([{ kind: 'markdown', text: 'hello\n\n- one\n- two' }]);
  });

  it.each([
    ['# Learn C#', 1, 'Learn C#'],
    ['## Plan ##', 2, 'Plan']
  ])('splitBlocks_Heading%s_KeepsTextWithoutClosingRun', (line, level, text) => {
    expect(splitBlocks(line)).toStrictEqual([{ kind: 'heading', level, text }]);
  });

  it('splitBlocks_HeadingBetweenProse_SplitsAroundHeading', () => {
    expect(splitBlocks('intro\n## Plan\nbody')).toStrictEqual([
      { kind: 'markdown', text: 'intro' },
      { kind: 'heading', level: 2, text: 'Plan' },
      { kind: 'markdown', text: 'body' }
    ]);
  });

  it('splitBlocks_ImageOnItsOwnLine_ReturnsImageBlock', () => {
    expect(splitBlocks('![egg](./egg.png)')).toStrictEqual([{ kind: 'image', alt: 'egg', source: './egg.png' }]);
  });

  it('splitBlocks_ImageInsideSentence_StaysProse', () => {
    expect(splitBlocks('see ![egg](./egg.png) here')).toStrictEqual([{ kind: 'markdown', text: 'see ![egg](./egg.png) here' }]);
  });
});

describe('splitBlocks fences', () => {
  it.each([
    ['bar', { kind: 'chart', language: 'bar', source: 'a: 1' }],
    ['chart', { kind: 'chart', language: 'chart', source: 'a: 1' }],
    ['flow', { kind: 'flow', dialect: 'flow', source: 'a: 1' }],
    ['ts', { kind: 'code', language: 'ts', source: 'a: 1' }]
  ])('splitBlocks_FenceLanguage%s_ReturnsMatchingBlock', (language, expected) => {
    expect(splitBlocks(`\`\`\`${language}\na: 1\n\`\`\``)).toStrictEqual([expected]);
  });

  it('splitBlocks_MermaidFlowchart_ReturnsFlowBlock', () => {
    expect(splitBlocks('```mermaid\ngraph TD\nA --> B\n```')).toStrictEqual([{ kind: 'flow', dialect: 'mermaid', source: 'graph TD\nA --> B' }]);
  });

  it('splitBlocks_MermaidSequence_ReturnsCodeBlock', () => {
    expect(splitBlocks('```mermaid\nsequenceDiagram\nA->>B: hi\n```')).toStrictEqual([{ kind: 'code', language: 'mermaid', source: 'sequenceDiagram\nA->>B: hi' }]);
  });

  it('splitBlocks_HeadingInsideFence_StaysCode', () => {
    expect(splitBlocks('```sh\n# comment\n```')).toStrictEqual([{ kind: 'code', language: 'sh', source: '# comment' }]);
  });

  it('splitBlocks_UnclosedFence_RunsToEnd', () => {
    expect(splitBlocks('```py\nprint(1)')).toStrictEqual([{ kind: 'code', language: 'py', source: 'print(1)' }]);
  });
});
