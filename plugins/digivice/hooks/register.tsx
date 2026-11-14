import type { EngineInterface, ElementTable, MatchedHook, Register, RenderChildren, RenderElement } from 'claude-code';

import { isPlainProse, splitBlocks, type Block } from '../src/blocks.ts';
import { parseChart, renderChart, type Line } from '../src/charts.ts';
import { parseGraph, renderGraph } from '../src/flow.ts';
import { decodeBase64Prefix, fitImage, isRemote, MAX_IMAGE_BASE64, PNG_HEADER_BYTES, readPngSize, resolveLocalPath, type Size } from '../src/image.ts';
import { createFileHref, linkifyPaths } from '../src/links.ts';
import { VIBES } from '../src/palette.ts';
import { toSlashes } from '../src/paths.ts';
import { DEMO_TEXT } from '../src/demo.ts';
import { pickPastWord, pickPresentWord } from '../src/words.ts';
import { LOOK, LOOK_PROBLEMS, SCENE } from './look.ts';

type Terminal = ElementTable<'terminal'>;
type Context = { terminal: Terminal; columns: number; home: string; showsImages: boolean };

const HEADING_MARKS = ['✦ ', '◆ ', '◇ ', '· ', '· ', '· '];
const HEADING_COLORS = [VIBES.sun, VIBES.sky, VIBES.leaf, VIBES.teal, VIBES.lavender, VIBES.blossom];
const IMAGE_TERMINALS = new Set(['ghostty', 'kitty', 'iTerm.app', 'WezTerm']);
const SCENE_NAME = 'digital-world';
const MAX_CACHED_IMAGES = 32;
const FRAME_WIDTH = 4;
const MIN_COLUMNS = 24;
const DEFAULT_COLUMNS = 80;
const VIEWPORT_MARGIN = 4;
const REPLY_GUTTER = 2;

type Picture = { base64: string; size: Size };

const readHome = async (engine: EngineInterface): Promise<string> => {
  const home = (await engine.env.get('USERPROFILE')) ?? (await engine.env.get('HOME')) ?? '';
  return toSlashes(home);
};

const readImageSupport = async (engine: EngineInterface): Promise<boolean> => {
  const [program, kitty, forced, multiplexer] = await Promise.all([
    engine.env.get('TERM_PROGRAM'),
    engine.env.get('KITTY_WINDOW_ID'),
    engine.env.get('CLAUDE_CODE_FORCE_TERMINAL_IMAGES'),
    engine.env.get('TMUX')
  ]);
  if (forced === '1') return true;
  return !multiplexer && (Boolean(kitty) || IMAGE_TERMINALS.has(program ?? ''));
};

const drawLines = (terminal: Terminal, lines: readonly Line[]): RenderElement => (
  <terminal.Box flexDirection="column">
    {lines.map(line => (
      <terminal.Text wrap="truncate">
        {line
          .filter(run => run.text)
          .map(run => (
            <terminal.Text {...(run.color ? { color: run.color } : {})} dimColor={run.dim === true} bold={run.bold === true}>
              {run.text}
            </terminal.Text>
          ))}
      </terminal.Text>
    ))}
  </terminal.Box>
);

const drawFrame = (terminal: Terminal, color: string, children: RenderChildren): RenderElement => (
  <terminal.Box flexDirection="column" borderStyle="round" borderColor={color} paddingX={1}>
    {children}
  </terminal.Box>
);

const drawCode = (terminal: Terminal, language: string, source: string): RenderElement =>
  drawFrame(terminal, VIBES.mountain, [
    language ? <terminal.Text color={VIBES.sun} bold>{language}</terminal.Text> : null,
    <terminal.Code source={source} {...(language ? { language } : {})} />
  ]);

const drawLinkRow = (terminal: Terminal, glyph: string, href: string, label: string, note?: string): RenderElement => (
  <terminal.Text>
    <terminal.Text color={VIBES.sky}>{glyph} </terminal.Text>
    <terminal.Link href={href} label={label || href} />
    {note ? <terminal.Text dimColor> {note}</terminal.Text> : null}
  </terminal.Text>
);

const readPicture = (base64: string): Picture | null => {
  const size = readPngSize(decodeBase64Prefix(base64, PNG_HEADER_BYTES));
  return size && base64.length <= MAX_IMAGE_BASE64 ? { base64, size } : null;
};

const drawPicture = (terminal: Terminal, context: Context, picture: Picture, alt: string): RenderElement => {
  const box = fitImage(picture.size, context.columns);
  return <terminal.Image source={{ png: picture.base64 }} columns={box.columns} rows={box.rows} alt={alt || ' '} />;
};

const pictures = new Map<string, Promise<Picture | null>>();

const readPictureFile = async (engine: EngineInterface, path: string): Promise<Picture | null> => {
  const file = await engine.fs.read(path, { as: 'bytes' }).catch(() => null);
  return file ? readPicture(file.base64) : null;
};

const loadPicture = async (engine: EngineInterface, path: string): Promise<Picture | null> => {
  const stat = await engine.fs.stat(path).catch(() => null);
  if (!stat) return null;
  const key = `${path}\0${stat.mtimeMs}`;
  const cached = pictures.get(key) ?? readPictureFile(engine, path);
  pictures.delete(key);
  pictures.set(key, cached);
  if (pictures.size > MAX_CACHED_IMAGES) pictures.delete(pictures.keys().next().value ?? key);
  return cached;
};

const drawImage = async (engine: EngineInterface, context: Context, alt: string, source: string): Promise<RenderElement> => {
  const { terminal, home } = context;
  if (isRemote(source)) return drawLinkRow(terminal, '▣', source, alt);
  const path = resolveLocalPath(source, home);
  const href = createFileHref(path, home);
  if (!context.showsImages || !path.toLowerCase().endsWith('.png')) return drawLinkRow(terminal, '▣', href, alt);
  const picture = await loadPicture(engine, path);
  if (!picture) return drawLinkRow(terminal, '▣', href, alt, '(not shown)');
  return (
    <terminal.Box flexDirection="column">
      {drawPicture(terminal, context, picture, alt)}
      {drawLinkRow(terminal, '▣', href, alt || path)}
    </terminal.Box>
  );
};

const drawBlock = (engine: EngineInterface, context: Context, block: Block): RenderElement | Promise<RenderElement> => {
  const { terminal, columns, home } = context;
  switch (block.kind) {
    case 'markdown': {
      return <terminal.Markdown text={linkifyPaths(block.text, home)} />;
    }
    case 'heading': {
      return (
        <terminal.Text bold color={HEADING_COLORS[block.level - 1] ?? VIBES.sun}>
          {HEADING_MARKS[block.level - 1]}
          {block.text.replaceAll(/\*\*|__|`/gu, '')}
        </terminal.Text>
      );
    }
    case 'code': {
      return drawCode(terminal, block.language, block.source);
    }
    case 'chart': {
      const chart = parseChart(block.language, block.source);
      if ('error' in chart) return drawCode(terminal, block.language, `${block.source}\n# ${chart.error}`);
      return drawFrame(terminal, VIBES.sky, drawLines(terminal, renderChart(chart, columns - FRAME_WIDTH)));
    }
    case 'flow': {
      const graph = parseGraph(block.source, block.dialect);
      if (graph.nodes.size === 0) return drawCode(terminal, block.dialect, block.source);
      return drawFrame(terminal, VIBES.leaf, drawLines(terminal, renderGraph(graph)));
    }
    case 'image': {
      return drawImage(engine, context, block.alt, block.source);
    }
  }
};

const drawBlocks = async (engine: EngineInterface, context: Context, blocks: readonly Block[]): Promise<RenderElement> => {
  const drawn = await Promise.all(blocks.map(block => drawBlock(engine, context, block)));
  return (
    <context.terminal.Box flexDirection="column" rowGap={1} flexGrow={1}>
      {drawn}
    </context.terminal.Box>
  );
};

const cache: { home?: Promise<string>; showsImages?: Promise<boolean> } = {};

const readCachedHome = (engine: EngineInterface): Promise<string> => (cache.home ??= readHome(engine));

const createContext = async (engine: EngineInterface, terminal: Terminal, viewportColumns: number | undefined): Promise<Context> => ({
  terminal,
  columns: Math.max(MIN_COLUMNS, (viewportColumns ?? DEFAULT_COLUMNS) - VIEWPORT_MARGIN),
  home: await readCachedHome(engine),
  showsImages: await (cache.showsImages ??= readImageSupport(engine).catch(() => false))
});

const renderReply: MatchedHook<'ui.render', { component: 'AssistantMessage' }> = async (engine, event, next) => {
  if (event.surface !== 'terminal' || event.props.isSummary) return next(event);
  const blocks = splitBlocks(event.props.text);
  if (isPlainProse(blocks)) {
    const text = linkifyPaths(event.props.text, await readCachedHome(engine));
    return text === event.props.text ? next(event) : next({ ...event, props: { ...event.props, text } });
  }
  const terminal = engine.ui.resolve(event);
  const context = await createContext(engine, terminal, event.viewport?.columns);
  return (
    <terminal.Box flexDirection="row">
      <terminal.Text color={VIBES.sun}>{event.props.isFirstOfReply ? '◉ ' : '  '}</terminal.Text>
      {await drawBlocks(engine, { ...context, columns: context.columns - REPLY_GUTTER }, blocks)}
    </terminal.Box>
  );
};

const renderToolResult: MatchedHook<'ui.render', { component: 'ToolResult' }> = async (engine, event, next) => {
  if (event.surface !== 'terminal' || event.props.isErrored || event.props.isExpanded || typeof event.props.output !== 'object' || event.props.output === null) return next(event);
  const output = event.props.output as { type?: unknown; filePath?: unknown; file?: { base64?: unknown; type?: unknown } };
  const terminal = engine.ui.resolve(event);
  const context = await createContext(engine, terminal, event.viewport?.columns);
  if ((event.props.tool === 'Write' || event.props.tool === 'Edit') && typeof output.filePath === 'string') {
    return (
      <terminal.Box flexDirection="column">
        {await next(event)}
        {drawLinkRow(terminal, '  ↗', createFileHref(output.filePath, context.home), output.filePath)}
      </terminal.Box>
    );
  }
  const isPngRead = event.props.tool === 'Read' && output.type === 'image' && output.file?.type === 'image/png' && typeof output.file.base64 === 'string';
  const picture = isPngRead && context.showsImages ? readPicture(String(output.file?.base64)) : null;
  if (!picture) return next(event);
  return (
    <terminal.Box flexDirection="column">
      {await next(event)}
      {drawPicture(terminal, context, picture, 'image preview')}
    </terminal.Box>
  );
};

export const register: Register = listen => {
  listen('session.start', async (engine, event, proceed) => {
    const unpainted = LOOK_PROBLEMS.find(line => line.startsWith("Desktop won't paint"));
    if (unpainted !== undefined) engine.ui.toast(`digivice: ${unpainted}`);
    await engine.theme.set(LOOK).catch(() => {});
    const started = await proceed(event);
    await engine.command
      .register({ name: 'digivice', description: 'Show the Digital World tour: charts, graphs, images and links' })
      .catch(() => {});
    return started;
  });

  listen('command.run', { command: 'digivice' }, engine => ({
    text: DEMO_TEXT.replaceAll('{root}', toSlashes(engine.plugin.root))
  }));

  listen('ui.render', { component: 'Backdrop' }, (engine, event, next) => {
    if ((event.surface !== 'desktop' && event.surface !== 'mobile') || event.props.scene !== SCENE_NAME) return next(event);
    const { Svg } = engine.ui.resolve(event);
    return <Svg source={SCENE} alt="A watercolor summer sky over misty mountains and green treetops" />;
  });

  listen('ui.render', { component: 'AssistantMessage' }, renderReply);

  listen('ui.render', { component: 'CommandOutput' }, async (engine, event, next) => {
    if (event.surface !== 'terminal' || event.props.command !== 'digivice' || event.props.isErrored) return next(event);
    const terminal = engine.ui.resolve(event);
    return drawBlocks(engine, await createContext(engine, terminal, event.viewport?.columns), splitBlocks(event.props.text));
  });

  listen('ui.render', { component: 'ToolResult' }, renderToolResult);

  listen('ui.render', { component: 'Spinner' }, (_engine, event, next) => next({ ...event, props: { ...event.props, word: pickPresentWord(event.props.word) } }));

  listen('ui.render', { component: 'TurnDuration' }, (_engine, event, next) => next({ ...event, props: { ...event.props, word: pickPastWord(event.props.word) } }));
};
