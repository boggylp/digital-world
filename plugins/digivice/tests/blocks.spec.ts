import { describe, expect, test } from 'vitest';

import { splitBlocks } from '../src/blocks.ts';

describe('splitBlocks', () => {
  test('splitBlocks_ProseOnly_ReturnsOneMarkdownBlock', () => {
    expect(splitBlocks('hello\n\n- one\n- two')).toEqual([{ kind: 'markdown', text: 'hello\n\n- one\n- two' }]);
  });

  test.each([
    ['# Learn C#', 1, 'Learn C#'],
    ['## Plan ##', 2, 'Plan']
  ])('splitBlocks_Heading%s_KeepsTextWithoutClosingRun', (line, level, text) => {
    expect(splitBlocks(line)).toEqual([{ kind: 'heading', level, text }]);
  });

  test('splitBlocks_HeadingBetweenProse_SplitsAroundHeading', () => {
    expect(splitBlocks('intro\n## Plan\nbody')).toEqual([
      { kind: 'markdown', text: 'intro' },
      { kind: 'heading', level: 2, text: 'Plan' },
      { kind: 'markdown', text: 'body' }
    ]);
  });

  test.each([
    ['bar', { kind: 'chart', language: 'bar', source: 'a: 1' }],
    ['chart', { kind: 'chart', language: 'chart', source: 'a: 1' }],
    ['flow', { kind: 'flow', dialect: 'flow', source: 'a: 1' }],
    ['ts', { kind: 'code', language: 'ts', source: 'a: 1' }]
  ])('splitBlocks_FenceLanguage%s_ReturnsMatchingBlock', (language, expected) => {
    expect(splitBlocks(`\`\`\`${language}\na: 1\n\`\`\``)).toEqual([expected]);
  });

  test('splitBlocks_MermaidFlowchart_ReturnsFlowBlock', () => {
    expect(splitBlocks('```mermaid\ngraph TD\nA --> B\n```')).toEqual([{ kind: 'flow', dialect: 'mermaid', source: 'graph TD\nA --> B' }]);
  });

  test('splitBlocks_MermaidSequence_ReturnsCodeBlock', () => {
    expect(splitBlocks('```mermaid\nsequenceDiagram\nA->>B: hi\n```')).toEqual([{ kind: 'code', language: 'mermaid', source: 'sequenceDiagram\nA->>B: hi' }]);
  });

  test('splitBlocks_HeadingInsideFence_StaysCode', () => {
    expect(splitBlocks('```sh\n# comment\n```')).toEqual([{ kind: 'code', language: 'sh', source: '# comment' }]);
  });

  test('splitBlocks_UnclosedFence_RunsToEnd', () => {
    expect(splitBlocks('```py\nprint(1)')).toEqual([{ kind: 'code', language: 'py', source: 'print(1)' }]);
  });

  test('splitBlocks_ImageOnItsOwnLine_ReturnsImageBlock', () => {
    expect(splitBlocks('![egg](./egg.png)')).toEqual([{ kind: 'image', alt: 'egg', source: './egg.png' }]);
  });

  test('splitBlocks_ImageInsideSentence_StaysProse', () => {
    expect(splitBlocks('see ![egg](./egg.png) here')).toEqual([{ kind: 'markdown', text: 'see ![egg](./egg.png) here' }]);
  });
});
