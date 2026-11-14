import { expect, test } from 'claude-code/testing';

const DOT_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function createReply(text: string, surface: 'terminal' | 'desktop') {
  return { plugin: 'digivice', component: 'AssistantMessage', requestId: 'reply-1', surface, props: { text, isFirstOfReply: true } } as const;
}

function createToolResult(tool: string, output: unknown) {
  return { plugin: 'digivice', component: 'ToolResult', requestId: 'tool-1', surface: 'terminal', props: { tool_use_id: 'tool-1', tool, output, isErrored: false } } as const;
}

test('Reply_BarChartFence_DrawsLabelledBar', async ($, on) => {
  on('env.get', () => ({ value: undefined }));
  const ui = await $.ui.mount(createReply('```hbar\nmega: 100\n```', 'terminal'));

  expect((await ui.find({ type: 'Text', text: /mega/ }))?.text).toMatch(/^mega █+ 100$/);
  await ui.unmount();
});

test('Reply_UnparseableChart_DrawsReasonUnderSource', async ($, on) => {
  on('env.get', () => ({ value: undefined }));
  const ui = await $.ui.mount(createReply('```bar\njust words\n```', 'terminal'));

  expect(await ui.find({ type: 'Code' })).toMatchObject({ props: { source: 'just words\n# no "name: number" rows' } });
  await ui.unmount();
});

test('Reply_MermaidFlowchart_DrawsTree', async ($, on) => {
  on('env.get', () => ({ value: undefined }));
  const ui = await $.ui.mount(createReply('```mermaid\ngraph TD\negg[Digitama] --> baby[Baby]\n```', 'terminal'));

  expect((await ui.find({ type: 'Text', text: /Baby/ }))?.text).toBe('└─▶ Baby');
  await ui.unmount();
});

test('Reply_RemoteImage_DrawsLink', async ($, on) => {
  on('env.get', () => ({ value: undefined }));
  const ui = await $.ui.mount(createReply('![egg](https://example.com/egg.png)', 'terminal'));

  expect(await ui.find({ type: 'Link' })).toMatchObject({ props: { href: 'https://example.com/egg.png', label: 'egg' } });
  await ui.unmount();
});

test('Reply_LocalPngWithoutImageTerminal_DrawsFileLink', async ($, on) => {
  on('env.get', () => ({ value: undefined }));
  const ui = await $.ui.mount(createReply('![egg](/tmp/egg.png)', 'terminal'));

  expect(await ui.find({ type: 'Link' })).toMatchObject({ props: { href: 'file:///tmp/egg.png' } });
  await ui.unmount();
});

test('Reply_ProseWithPath_HandsEngineALinkedPath', async ($, on) => {
  on('env.get', () => ({ value: undefined }));
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e);
    return <Text>{e.component === 'AssistantMessage' ? e.props.text : ''}</Text>;
  });
  const ui = await $.ui.mount(createReply('edited C:\\repo\\a.ts', 'terminal'));

  expect((await ui.find({ type: 'Text' }))?.text).toBe('edited [C:\\repo\\a.ts](file:///C:/repo/a.ts)');
  await ui.unmount();
});

test('Reply_OnDesktop_LeavesReplyToEngine', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e);
    return <Text>engine</Text>;
  });
  const ui = await $.ui.mount(createReply('```bar\na: 1\n```', 'desktop'));

  expect((await ui.find({ type: 'Text' }))?.text).toBe('engine');
  await ui.unmount();
});

test('ToolResult_EditOfFile_AddsFileLink', async ($, on) => {
  on('env.get', () => ({ value: undefined }));
  const ui = await $.ui.mount(createToolResult('Edit', { filePath: '/repo/a.ts' }));

  expect(await ui.find({ type: 'Link' })).toMatchObject({ props: { href: 'file:///repo/a.ts', label: '/repo/a.ts' } });
  await ui.unmount();
});

test('ToolResult_ReadOfPngInImageTerminal_ShowsImage', async ($, on) => {
  on('env.get', (_, e) => ({ value: e.name === 'CLAUDE_CODE_FORCE_TERMINAL_IMAGES' ? '1' : undefined }));
  const ui = await $.ui.mount(createToolResult('Read', { type: 'image', file: { base64: DOT_PNG_BASE64, type: 'image/png', originalSize: 70 } }));

  expect(await ui.find({ type: 'Image' })).toMatchObject({ props: { columns: 1, rows: 1 } });
  await ui.unmount();
});

test('ToolResult_NullOutput_LeavesRowToEngine', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e);
    return <Text>engine</Text>;
  });
  const ui = await $.ui.mount(createToolResult('Bash', null));

  expect((await ui.find({ type: 'Text' }))?.text).toBe('engine');
  await ui.unmount();
});

test('Spinner_Sauteing_ShowsHatching', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e);
    return <Text>{e.component === 'Spinner' ? e.props.word : ''}</Text>;
  });
  const ui = await $.ui.mount({ plugin: 'digivice', component: 'Spinner', requestId: 'spin', surface: 'terminal', props: { word: 'Sauteing', message: null, suffix: '…', mode: 'thinking' } });

  expect((await ui.find({ type: 'Text' }))?.text).toBe('Hatching');
  await ui.unmount();
});

test('TurnDuration_Baked_ShowsCharged', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e);
    return <Text>{e.component === 'TurnDuration' ? e.props.word : ''}</Text>;
  });
  const ui = await $.ui.mount({ plugin: 'digivice', component: 'TurnDuration', requestId: 'turn', surface: 'terminal', props: { word: 'Baked', durationMs: 3000 } });

  expect((await ui.find({ type: 'Text' }))?.text).toBe('Charged');
  await ui.unmount();
});

test('Command_Digivice_ToursChartsGraphsAndImages', async ($, on) => {
  on('env.get', () => ({ value: undefined }));
  on('command.register', () => ({ value: { command: 'digivice' } }));
  on('session.start', (_, e) => ({ cwd: e.cwd }));
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true });
  const { text = '' } = await $.command.run({ command: 'digivice', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } });
  const ui = await $.ui.mount({ plugin: 'digivice', component: 'CommandOutput', requestId: 'tour', surface: 'terminal', props: { command: 'digivice', args: '', text, isErrored: false } });

  expect((await ui.find({ type: 'Text', text: /Dark Champion/ }))?.text).toBe('        └─▶ ‹fear› Dark Champion');
  await ui.unmount();
});
