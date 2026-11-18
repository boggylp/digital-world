import type { EngineInterface, ElementTable, MatchedHook, Register, RenderChildren, RenderElement, RenderSurface } from 'claude-code';

import { isPlainProse, splitBlocks, type Block } from '../src/blocks.ts';
import { describeChart, parseChart, renderChart, type Chart, type Line } from '../src/charts.ts';
import { parseGraph, renderGraph } from '../src/flow.ts';
import { highlightLines, isHighlightable } from '../src/highlight.ts';
import { decodeBase64Prefix, fitImage, isRemote, MAX_IMAGE_BASE64, PNG_HEADER_BYTES, readPngSize, resolveLocalPath, type Size } from '../src/image.ts';
import { createFileHref, linkifyPaths } from '../src/links.ts';
import { VIBES } from '../src/palette.ts';
import { toSlashes } from '../src/paths.ts';
import { DEMO_TEXT } from '../src/demo.ts';
import { createPictureSvg, MAX_SVG_CHARS, renderChartSvg } from '../src/svg.ts';
import { pickPastWord, pickPresentWord } from '../src/words.ts';
import { LOOK, LOOK_PROBLEMS, SCENE } from './look.ts';

type Terminal = ElementTable<'terminal'>;
type Shared = Pick<Terminal, 'Box' | 'Text' | 'Link' | 'Code' | 'Markdown'>;
type Canvas = { kind: 'image'; Image: Terminal['Image'] } | { kind: 'svg'; Svg: ElementTable<'desktop'>['Svg'] };
type Context = { elements: Shared; canvas: Canvas; columns: number; home: string; showsImages: boolean };

const HEADING_MARKS = ['✦ ', '◆ ', '◇ ', '· ', '· ', '· '];
const HEADING_COLORS = [VIBES.sun, VIBES.sky, VIBES.leaf, VIBES.teal, VIBES.lavender, VIBES.blossom];
const IMAGE_TERMINALS = new Set(['ghostty', 'kitty', 'iTerm.app', 'WezTerm']);
const DRAWN_SURFACES = new Set<RenderSurface>(['terminal', 'desktop']);
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

const drawLines = (elements: Shared, lines: readonly Line[], wrap: 'truncate' | 'wrap' = 'truncate'): RenderElement => (
  <elements.Box flexDirection="column">
    {lines.map(line => (
      <elements.Text wrap={wrap}>
        {line
          .filter(run => run.text)
          .map(run => (
            <elements.Text {...(run.color ? { color: run.color } : {})} dimColor={run.dim === true} bold={run.bold === true}>
              {run.text}
            </elements.Text>
          ))}
      </elements.Text>
    ))}
  </elements.Box>
);

const drawFrame = (elements: Shared, color: string, children: RenderChildren): RenderElement => (
  <elements.Box flexDirection="column" borderStyle="round" borderColor={color} paddingX={1}>
    {children}
  </elements.Box>
);

const drawCode = ({ elements, canvas }: Context, language: string, source: string): RenderElement =>
  drawFrame(elements, VIBES.mountain, [
    language ? <elements.Text color={VIBES.sun} bold>{language}</elements.Text> : null,
    canvas.kind === 'image' && isHighlightable(language) ? (
      drawLines(elements, highlightLines(source, language), 'wrap')
    ) : (
      <elements.Code source={source} {...(language ? { language } : {})} />
    )
  ]);

const drawLinkRow = (elements: Shared, glyph: string, href: string, label: string, note?: string): RenderElement => (
  <elements.Text>
    <elements.Text color={VIBES.sky}>{glyph} </elements.Text>
    <elements.Link href={href} label={label || href} />
    {note ? <elements.Text dimColor> {note}</elements.Text> : null}
  </elements.Text>
);

const readPicture = (base64: string, maxChars: number): Picture | null => {
  const size = readPngSize(decodeBase64Prefix(base64, PNG_HEADER_BYTES));
  return size && base64.length <= maxChars ? { base64, size } : null;
};

const readPictureLimit = (canvas: Canvas): number => (canvas.kind === 'svg' ? MAX_SVG_CHARS : MAX_IMAGE_BASE64);

const drawPicture = (context: Context, picture: Picture, alt: string): RenderElement | null => {
  const { canvas } = context;
  if (canvas.kind === 'svg') {
    const source = createPictureSvg(picture.base64, picture.size);
    return source === null ? null : <canvas.Svg source={source} alt={alt || 'image'} />;
  }
  const box = fitImage(picture.size, context.columns);
  return <canvas.Image source={{ png: picture.base64 }} columns={box.columns} rows={box.rows} alt={alt || ' '} />;
};

const drawChart = (context: Context, chart: Chart): RenderElement => {
  const { canvas, elements } = context;
  const source = canvas.kind === 'svg' ? renderChartSvg(chart) : null;
  const drawing = canvas.kind === 'svg' && source !== null ? <canvas.Svg source={source} alt={describeChart(chart)} /> : drawLines(elements, renderChart(chart, context.columns - FRAME_WIDTH));
  return drawFrame(elements, VIBES.sky, drawing);
};

const pictures = new Map<string, Promise<Picture | null>>();

const readPictureFile = async (engine: EngineInterface, path: string, maxChars: number): Promise<Picture | null> => {
  const file = await engine.fs.read(path, { as: 'bytes' }).catch(() => null);
  return file ? readPicture(file.base64, maxChars) : null;
};

const loadPicture = async (engine: EngineInterface, path: string, maxChars: number): Promise<Picture | null> => {
  const stat = await engine.fs.stat(path).catch(() => null);
  if (!stat) return null;
  const key = `${path}\0${stat.mtimeMs}\0${maxChars}`;
  const cached = pictures.get(key) ?? readPictureFile(engine, path, maxChars);
  pictures.delete(key);
  pictures.set(key, cached);
  if (pictures.size > MAX_CACHED_IMAGES) pictures.delete(pictures.keys().next().value ?? key);
  return cached;
};

const drawImage = async (engine: EngineInterface, context: Context, alt: string, source: string): Promise<RenderElement> => {
  const { elements, home } = context;
  if (isRemote(source)) return drawLinkRow(elements, '▣', source, alt);
  const path = resolveLocalPath(source, home);
  const href = createFileHref(path, home);
  if (!context.showsImages || !path.toLowerCase().endsWith('.png')) return drawLinkRow(elements, '▣', href, alt);
  const picture = await loadPicture(engine, path, readPictureLimit(context.canvas));
  const drawn = picture ? drawPicture(context, picture, alt) : null;
  if (!drawn) return drawLinkRow(elements, '▣', href, alt, '(not shown)');
  return (
    <elements.Box flexDirection="column">
      {drawn}
      {drawLinkRow(elements, '▣', href, alt || path)}
    </elements.Box>
  );
};

const drawBlock = (engine: EngineInterface, context: Context, block: Block): RenderElement | Promise<RenderElement> => {
  const { elements, home } = context;
  switch (block.kind) {
    case 'markdown': {
      return <elements.Markdown text={linkifyPaths(block.text, home)} />;
    }
    case 'heading': {
      return (
        <elements.Text bold color={HEADING_COLORS[block.level - 1] ?? VIBES.sun}>
          {HEADING_MARKS[block.level - 1]}
          {block.text.replaceAll(/\*\*|__|`/gu, '')}
        </elements.Text>
      );
    }
    case 'code': {
      return drawCode(context, block.language, block.source);
    }
    case 'chart': {
      const chart = parseChart(block.language, block.source);
      if ('error' in chart) return drawCode(context, block.language, `${block.source}\n# ${chart.error}`);
      return drawChart(context, chart);
    }
    case 'flow': {
      const graph = parseGraph(block.source, block.dialect);
      if (graph.nodes.size === 0) return drawCode(context, block.dialect, block.source);
      return drawFrame(elements, VIBES.leaf, drawLines(elements, renderGraph(graph)));
    }
    case 'image': {
      return drawImage(engine, context, block.alt, block.source);
    }
  }
};

const drawBlocks = async (engine: EngineInterface, context: Context, blocks: readonly Block[]): Promise<RenderElement> => {
  const drawn = await Promise.all(blocks.map(block => drawBlock(engine, context, block)));
  return (
    <context.elements.Box flexDirection="column" rowGap={1} flexGrow={1}>
      {drawn}
    </context.elements.Box>
  );
};

const cache: { home?: Promise<string>; showsImages?: Promise<boolean> } = {};

const readCachedHome = (engine: EngineInterface): Promise<string> => (cache.home ??= readHome(engine));

type Drawn = { surface: RenderSurface; table: ElementTable; viewportColumns: number | undefined };

const pickCanvas = (surface: RenderSurface, table: ElementTable): Canvas => {
  if (surface !== 'terminal' && 'Svg' in table) return { kind: 'svg', Svg: table.Svg };
  if ('Image' in table) return { kind: 'image', Image: table.Image };
  throw new Error(`No picture element on ${surface}`);
};

const createContext = async (engine: EngineInterface, { surface, table, viewportColumns }: Drawn): Promise<Context> => {
  const canvas = pickCanvas(surface, table);
  return {
    elements: table,
    canvas,
    columns: Math.max(MIN_COLUMNS, (viewportColumns ?? DEFAULT_COLUMNS) - VIEWPORT_MARGIN),
    home: await readCachedHome(engine),
    showsImages: canvas.kind === 'svg' || (await (cache.showsImages ??= readImageSupport(engine).catch(() => false)))
  };
};

const renderReply: MatchedHook<'ui.render', { component: 'AssistantMessage' }> = async (engine, event, next) => {
  if (!DRAWN_SURFACES.has(event.surface) || event.props.isSummary) return next(event);
  const blocks = splitBlocks(event.props.text);
  if (isPlainProse(blocks)) {
    const text = linkifyPaths(event.props.text, await readCachedHome(engine));
    return text === event.props.text ? next(event) : next({ ...event, props: { ...event.props, text } });
  }
  const elements = engine.ui.resolve(event);
  const context = await createContext(engine, { surface: event.surface, table: elements, viewportColumns: event.viewport?.columns });
  return (
    <elements.Box flexDirection="row">
      <elements.Text color={VIBES.sun}>{event.props.isFirstOfReply ? '◉ ' : '  '}</elements.Text>
      {await drawBlocks(engine, { ...context, columns: context.columns - REPLY_GUTTER }, blocks)}
    </elements.Box>
  );
};

const renderToolResult: MatchedHook<'ui.render', { component: 'ToolResult' }> = async (engine, event, next) => {
  if (!DRAWN_SURFACES.has(event.surface) || event.props.isErrored || event.props.isExpanded || typeof event.props.output !== 'object' || event.props.output === null) return next(event);
  const output = event.props.output as { type?: unknown; filePath?: unknown; file?: { base64?: unknown; type?: unknown } };
  const elements = engine.ui.resolve(event);
  const context = await createContext(engine, { surface: event.surface, table: elements, viewportColumns: event.viewport?.columns });
  if ((event.props.tool === 'Write' || event.props.tool === 'Edit') && typeof output.filePath === 'string') {
    return (
      <elements.Box flexDirection="column">
        {await next(event)}
        {drawLinkRow(elements, '  ↗', createFileHref(output.filePath, context.home), output.filePath)}
      </elements.Box>
    );
  }
  const isPngRead = event.props.tool === 'Read' && output.type === 'image' && output.file?.type === 'image/png' && typeof output.file.base64 === 'string';
  const picture = isPngRead && context.showsImages ? readPicture(String(output.file?.base64), readPictureLimit(context.canvas)) : null;
  const drawn = picture ? drawPicture(context, picture, 'image preview') : null;
  if (!drawn) return next(event);
  return (
    <elements.Box flexDirection="column">
      {await next(event)}
      {drawn}
    </elements.Box>
  );
};

export const register: Register = listen => {
  listen('session.start', async (engine, event, proceed) => {
    const unpainted = LOOK_PROBLEMS.find(line => line.startsWith("Desktop won't paint"));
    if (unpainted !== undefined) engine.ui.toast(`digi-theme: ${unpainted}`);
    await engine.theme.set(LOOK).catch(() => {});
    const started = await proceed(event);
    await engine.command
      .register({ name: 'digi-theme', description: 'Show the Digital World tour: charts, graphs, images and links' })
      .catch(() => {});
    return started;
  });

  listen('command.run', { command: 'digi-theme' }, engine => ({
    text: DEMO_TEXT.replaceAll('{root}', toSlashes(engine.plugin.root))
  }));

  listen('ui.render', { component: 'Backdrop' }, (engine, event, next) => {
    if ((event.surface !== 'desktop' && event.surface !== 'mobile') || event.props.scene !== SCENE_NAME) return next(event);
    const { Svg } = engine.ui.resolve(event);
    return <Svg source={SCENE} alt="A watercolor summer sky over misty mountains and green treetops" />;
  });

  listen('ui.render', { component: 'AssistantMessage' }, renderReply);

  listen('ui.render', { component: 'CommandOutput' }, async (engine, event, next) => {
    if (!DRAWN_SURFACES.has(event.surface) || event.props.command !== 'digi-theme' || event.props.isErrored) return next(event);
    const elements = engine.ui.resolve(event);
    return drawBlocks(engine, await createContext(engine, { surface: event.surface, table: elements, viewportColumns: event.viewport?.columns }), splitBlocks(event.props.text));
  });

  listen('ui.render', { component: 'ToolResult' }, renderToolResult);

  listen('ui.render', { component: 'Spinner' }, (_engine, event, next) => next({ ...event, props: { ...event.props, word: pickPresentWord(event.props.word) } }));

  listen('ui.render', { component: 'TurnDuration' }, (_engine, event, next) => next({ ...event, props: { ...event.props, word: pickPastWord(event.props.word) } }));
};
