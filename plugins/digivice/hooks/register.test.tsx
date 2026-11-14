import type { Hook } from 'claude-code';
import { expect, test } from 'claude-code/testing';

const DOT_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const FORCED_IMAGE_ENV = new Map([['CLAUDE_CODE_FORCE_TERMINAL_IMAGES', '1']]);

const createReply = (text: string, surface: 'terminal' | 'desktop') =>
  ({ plugin: 'digivice', component: 'AssistantMessage', requestId: 'reply-1', surface, props: { text, isFirstOfReply: true } }) as const;

const createToolResult = (tool: string, output: unknown) =>
  ({ plugin: 'digivice', component: 'ToolResult', requestId: 'tool-1', surface: 'terminal', props: { tool_use_id: 'tool-1', tool, output, isErrored: false } }) as const;

const drawEngineText: Hook<'ui.render'> = (engine, event) => {
  const { Text } = engine.ui.resolve(event);
  return <Text>engine</Text>;
};

const drawReplyText: Hook<'ui.render'> = (engine, event) => {
  const { Text } = engine.ui.resolve(event);
  return <Text>{event.component === 'AssistantMessage' ? event.props.text : ''}</Text>;
};

const drawSpinnerWord: Hook<'ui.render'> = (engine, event) => {
  const { Text } = engine.ui.resolve(event);
  return <Text>{event.component === 'Spinner' ? event.props.word : ''}</Text>;
};

const drawTurnWord: Hook<'ui.render'> = (engine, event) => {
  const { Text } = engine.ui.resolve(event);
  return <Text>{event.component === 'TurnDuration' ? event.props.word : ''}</Text>;
};

test('Reply_BarChartFence_DrawsLabelledBar', async (engine, listen) => {
  listen('env.get', () => ({ value: undefined }));
  const view = await engine.ui.mount(createReply('```hbar\nmega: 100\n```', 'terminal'));
  const bar = await view.find({ type: 'Text', text: /mega/u });

  expect(bar?.text).toMatch(/^mega █+ 100$/u);
  await view.unmount();
});

test('Reply_UnparseableChart_DrawsReasonUnderSource', async (engine, listen) => {
  listen('env.get', () => ({ value: undefined }));
  const view = await engine.ui.mount(createReply('```bar\njust words\n```', 'terminal'));

  expect(await view.find({ type: 'Code' })).toMatchObject({ props: { source: 'just words\n# no "name: number" rows' } });
  await view.unmount();
});

test('Reply_MermaidFlowchart_DrawsTree', async (engine, listen) => {
  listen('env.get', () => ({ value: undefined }));
  const view = await engine.ui.mount(createReply('```mermaid\ngraph TD\negg[Digitama] --> baby[Baby]\n```', 'terminal'));
  const node = await view.find({ type: 'Text', text: /Baby/u });

  expect(node?.text).toBe('└─▶ Baby');
  await view.unmount();
});

test('Reply_RemoteImage_DrawsLink', async (engine, listen) => {
  listen('env.get', () => ({ value: undefined }));
  const view = await engine.ui.mount(createReply('![egg](https://example.com/egg.png)', 'terminal'));

  expect(await view.find({ type: 'Link' })).toMatchObject({ props: { href: 'https://example.com/egg.png', label: 'egg' } });
  await view.unmount();
});

test('Reply_LocalPngWithoutImageTerminal_DrawsFileLink', async (engine, listen) => {
  listen('env.get', () => ({ value: undefined }));
  const view = await engine.ui.mount(createReply('![egg](/tmp/egg.png)', 'terminal'));

  expect(await view.find({ type: 'Link' })).toMatchObject({ props: { href: 'file:///tmp/egg.png' } });
  await view.unmount();
});

test('Reply_ProseWithPath_HandsEngineALinkedPath', async (engine, listen) => {
  listen('env.get', () => ({ value: undefined }));
  listen('ui.render', drawReplyText);
  const view = await engine.ui.mount(createReply(String.raw`edited C:\repo\a.ts`, 'terminal'));
  const text = await view.find({ type: 'Text' });

  expect(text?.text).toBe(String.raw`edited [C:\repo\a.ts](file:///C:/repo/a.ts)`);
  await view.unmount();
});

test('Reply_OnDesktop_LeavesReplyToEngine', async (engine, listen) => {
  listen('ui.render', drawEngineText);
  const view = await engine.ui.mount(createReply('```bar\na: 1\n```', 'desktop'));
  const text = await view.find({ type: 'Text' });

  expect(text?.text).toBe('engine');
  await view.unmount();
});

test('ToolResult_EditOfFile_AddsFileLink', async (engine, listen) => {
  listen('env.get', () => ({ value: undefined }));
  const view = await engine.ui.mount(createToolResult('Edit', { filePath: '/repo/a.ts' }));

  expect(await view.find({ type: 'Link' })).toMatchObject({ props: { href: 'file:///repo/a.ts', label: '/repo/a.ts' } });
  await view.unmount();
});

test('ToolResult_ReadOfPngInImageTerminal_ShowsImage', async (engine, listen) => {
  listen('env.get', (_engine, event) => ({ value: FORCED_IMAGE_ENV.get(event.name) }));
  const view = await engine.ui.mount(createToolResult('Read', { type: 'image', file: { base64: DOT_PNG_BASE64, type: 'image/png', originalSize: 70 } }));

  expect(await view.find({ type: 'Image' })).toMatchObject({ props: { columns: 1, rows: 1 } });
  await view.unmount();
});

test('ToolResult_NullOutput_LeavesRowToEngine', async (engine, listen) => {
  listen('ui.render', drawEngineText);
  const view = await engine.ui.mount(createToolResult('Bash', null));
  const text = await view.find({ type: 'Text' });

  expect(text?.text).toBe('engine');
  await view.unmount();
});

test('Spinner_Sauteing_ShowsHatching', async (engine, listen) => {
  listen('ui.render', drawSpinnerWord);
  const view = await engine.ui.mount({ plugin: 'digivice', component: 'Spinner', requestId: 'spin', surface: 'terminal', props: { word: 'Sauteing', message: null, suffix: '…', mode: 'thinking' } });
  const text = await view.find({ type: 'Text' });

  expect(text?.text).toBe('Hatching');
  await view.unmount();
});

test('TurnDuration_Baked_ShowsCharged', async (engine, listen) => {
  listen('ui.render', drawTurnWord);
  const view = await engine.ui.mount({ plugin: 'digivice', component: 'TurnDuration', requestId: 'turn', surface: 'terminal', props: { word: 'Baked', durationMs: 3000 } });
  const text = await view.find({ type: 'Text' });

  expect(text?.text).toBe('Charged');
  await view.unmount();
});

test('Command_Digivice_ToursChartsGraphsAndImages', async (engine, listen) => {
  listen('env.get', () => ({ value: undefined }));
  listen('command.register', () => ({ value: { command: 'digivice' } }));
  listen('session.start', (_engine, event) => ({ cwd: event.cwd }));
  await engine.session.start({ cwd: '/', surface: 'terminal', isInteractive: true });
  const { text = '' } = await engine.command.run({ command: 'digivice', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } });
  const view = await engine.ui.mount({ plugin: 'digivice', component: 'CommandOutput', requestId: 'tour', surface: 'terminal', props: { command: 'digivice', args: '', text, isErrored: false } });
  const branch = await view.find({ type: 'Text', text: /Dark Champion/u });

  expect(branch?.text).toBe('        └─▶ ‹fear› Dark Champion');
  await view.unmount();
});
