import type { EngineInterface, ElementTable, Register, RenderChildren, RenderElement } from 'claude-code';

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
type Context = { el: Terminal; columns: number; home: string; showsImages: boolean };

const HEADING_MARKS = ['✦ ', '◆ ', '◇ ', '· ', '· ', '· '];
const HEADING_COLORS = [VIBES.sun, VIBES.sky, VIBES.leaf, VIBES.teal, VIBES.lavender, VIBES.blossom];
const IMAGE_TERMINALS = new Set(['ghostty', 'kitty', 'iTerm.app', 'WezTerm']);
const SCENE_NAME = 'digital-world';
const MAX_CACHED_IMAGES = 32;

type Picture = { base64: string; size: Size };

async function readHome(engine: EngineInterface): Promise<string> {
  const home = (await engine.env.get('USERPROFILE')) ?? (await engine.env.get('HOME')) ?? '';
  return toSlashes(home);
}

async function readImageSupport(engine: EngineInterface): Promise<boolean> {
  const [terminal, kitty, forced, multiplexer] = await Promise.all([
    engine.env.get('TERM_PROGRAM'),
    engine.env.get('KITTY_WINDOW_ID'),
    engine.env.get('CLAUDE_CODE_FORCE_TERMINAL_IMAGES'),
    engine.env.get('TMUX')
  ]);
  if (forced === '1') return true;
  return !multiplexer && (Boolean(kitty) || IMAGE_TERMINALS.has(terminal ?? ''));
}

function drawLines(el: Terminal, lines: readonly Line[]): RenderElement {
  return (
    <el.Box flexDirection="column">
      {lines.map(line => (
        <el.Text wrap="truncate">
          {line
            .filter(run => run.text)
            .map(run => (
              <el.Text {...(run.color ? { color: run.color } : {})} dimColor={run.dim === true} bold={run.bold === true}>
                {run.text}
              </el.Text>
            ))}
        </el.Text>
      ))}
    </el.Box>
  );
}

function drawFrame(el: Terminal, color: string, children: RenderChildren): RenderElement {
  return (
    <el.Box flexDirection="column" borderStyle="round" borderColor={color} paddingX={1}>
      {children}
    </el.Box>
  );
}

function drawCode(el: Terminal, language: string, source: string): RenderElement {
  return drawFrame(el, VIBES.mountain, [
    language ? <el.Text color={VIBES.sun} bold>{language}</el.Text> : null,
    <el.Code source={source} {...(language ? { language } : {})} />
  ]);
}

function drawLinkRow(el: Terminal, glyph: string, href: string, label: string, note?: string): RenderElement {
  return (
    <el.Text>
      <el.Text color={VIBES.sky}>{glyph} </el.Text>
      <el.Link href={href} label={label || href} />
      {note ? <el.Text dimColor> {note}</el.Text> : null}
    </el.Text>
  );
}

function readPicture(base64: string): Picture | null {
  const size = readPngSize(decodeBase64Prefix(base64, PNG_HEADER_BYTES));
  return size && base64.length <= MAX_IMAGE_BASE64 ? { base64, size } : null;
}

function drawPicture(el: Terminal, context: Context, picture: Picture, alt: string): RenderElement {
  const box = fitImage(picture.size, context.columns);
  return <el.Image source={{ png: picture.base64 }} columns={box.columns} rows={box.rows} alt={alt || ' '} />;
}

const pictures = new Map<string, Promise<Picture | null>>();

async function loadPicture(engine: EngineInterface, path: string): Promise<Picture | null> {
  const stat = await engine.fs.stat(path).catch(() => null);
  if (!stat) return null;
  const key = `${path}\0${stat.mtimeMs}`;
  const cached = pictures.get(key) ?? engine.fs.read(path, { as: 'bytes' }).then(read => readPicture(read.base64), () => null);
  pictures.delete(key);
  pictures.set(key, cached);
  if (pictures.size > MAX_CACHED_IMAGES) pictures.delete(pictures.keys().next().value ?? key);
  return cached;
}

async function drawImage(engine: EngineInterface, context: Context, alt: string, source: string): Promise<RenderElement> {
  const { el, home } = context;
  if (isRemote(source)) return drawLinkRow(el, '▣', source, alt);
  const path = resolveLocalPath(source, home);
  const href = createFileHref(path, home);
  if (!context.showsImages || !/\.png$/i.test(path)) return drawLinkRow(el, '▣', href, alt);
  const picture = await loadPicture(engine, path);
  if (!picture) return drawLinkRow(el, '▣', href, alt, '(not shown)');
  return (
    <el.Box flexDirection="column">
      {drawPicture(el, context, picture, alt)}
      {drawLinkRow(el, '▣', href, alt || path)}
    </el.Box>
  );
}

async function drawBlock(engine: EngineInterface, context: Context, block: Block): Promise<RenderElement> {
  const { el, columns, home } = context;
  switch (block.kind) {
    case 'markdown':
      return <el.Markdown text={linkifyPaths(block.text, home)} />;
    case 'heading':
      return (
        <el.Text bold color={HEADING_COLORS[block.level - 1] ?? VIBES.sun}>
          {HEADING_MARKS[block.level - 1]}
          {block.text.replace(/\*\*|__|`/g, '')}
        </el.Text>
      );
    case 'code':
      return drawCode(el, block.language, block.source);
    case 'chart': {
      const chart = parseChart(block.language, block.source);
      if ('error' in chart) return drawCode(el, block.language, `${block.source}\n# ${chart.error}`);
      return drawFrame(el, VIBES.sky, drawLines(el, renderChart(chart, columns - 4)));
    }
    case 'flow': {
      const graph = parseGraph(block.source, block.dialect);
      if (graph.nodes.size === 0) return drawCode(el, block.dialect, block.source);
      return drawFrame(el, VIBES.leaf, drawLines(el, renderGraph(graph)));
    }
    case 'image':
      return drawImage(engine, context, block.alt, block.source);
  }
}

async function drawBlocks(engine: EngineInterface, context: Context, blocks: readonly Block[]): Promise<RenderElement> {
  const drawn = await Promise.all(blocks.map(block => drawBlock(engine, context, block)));
  return (
    <context.el.Box flexDirection="column" rowGap={1} flexGrow={1}>
      {drawn}
    </context.el.Box>
  );
}

let showsImages: Promise<boolean> | undefined;
let home: Promise<string> | undefined;

function readCachedHome(engine: EngineInterface): Promise<string> {
  return (home ??= readHome(engine));
}

async function createContext(engine: EngineInterface, el: Terminal, viewportColumns: number | undefined): Promise<Context> {
  return {
    el,
    columns: Math.max(24, (viewportColumns ?? 80) - 4),
    home: await readCachedHome(engine),
    showsImages: await (showsImages ??= readImageSupport(engine).catch(() => false))
  };
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const unpainted = LOOK_PROBLEMS.find(line => line.startsWith("Desktop won't paint"));
    if (unpainted !== undefined) $.ui.toast(`digivice: ${unpainted}`);
    await $.theme.set(LOOK).catch(() => undefined);
    const started = await next(e);
    await $.command
      .register({ name: 'digivice', description: 'Show the Digital World tour: charts, graphs, images and links' })
      .catch(() => undefined);
    return started;
  });

  on('command.run', { command: 'digivice' }, async $ => ({
    text: DEMO_TEXT.replaceAll('{root}', toSlashes($.plugin.root))
  }));

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || e.props.scene !== SCENE_NAME) return next(e);
    const { Svg } = $.ui.resolve(e);
    return <Svg source={SCENE} alt="A watercolor summer sky over misty mountains and green treetops" />;
  });

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    if (e.surface !== 'terminal' || e.props.isSummary) return next(e);
    const blocks = splitBlocks(e.props.text);
    if (isPlainProse(blocks)) {
      const text = linkifyPaths(e.props.text, await readCachedHome($));
      return text === e.props.text ? next(e) : next({ ...e, props: { ...e.props, text } });
    }
    const el = $.ui.resolve(e);
    const context = await createContext($, el, e.viewport?.columns);
    return (
      <el.Box flexDirection="row">
        <el.Text color={VIBES.sun}>{e.props.isFirstOfReply ? '◉ ' : '  '}</el.Text>
        {await drawBlocks($, { ...context, columns: context.columns - 2 }, blocks)}
      </el.Box>
    );
  });

  on('ui.render', { component: 'CommandOutput' }, async ($, e, next) => {
    if (e.surface !== 'terminal' || e.props.command !== 'digivice' || e.props.isErrored) return next(e);
    const el = $.ui.resolve(e);
    return drawBlocks($, await createContext($, el, e.viewport?.columns), splitBlocks(e.props.text));
  });

  on('ui.render', { component: 'ToolResult' }, async ($, e, next) => {
    if (e.surface !== 'terminal' || e.props.isErrored || e.props.isExpanded || typeof e.props.output !== 'object' || e.props.output === null) return next(e);
    const output = e.props.output as { type?: unknown; filePath?: unknown; file?: { base64?: unknown; type?: unknown } };
    const el = $.ui.resolve(e);
    const context = await createContext($, el, e.viewport?.columns);
    if ((e.props.tool === 'Write' || e.props.tool === 'Edit') && typeof output.filePath === 'string') {
      return (
        <el.Box flexDirection="column">
          {await next(e)}
          {drawLinkRow(el, '  ↗', createFileHref(output.filePath, context.home), output.filePath)}
        </el.Box>
      );
    }
    const isPngRead = e.props.tool === 'Read' && output.type === 'image' && output.file?.type === 'image/png' && typeof output.file.base64 === 'string';
    const picture = isPngRead && context.showsImages ? readPicture(String(output.file?.base64)) : null;
    if (!picture) return next(e);
    return (
      <el.Box flexDirection="column">
        {await next(e)}
        {drawPicture(el, context, picture, 'image preview')}
      </el.Box>
    );
  });

  on('ui.render', { component: 'Spinner' }, (_$, e, next) => next({ ...e, props: { ...e.props, word: pickPresentWord(e.props.word) } }));

  on('ui.render', { component: 'TurnDuration' }, (_$, e, next) => next({ ...e, props: { ...e.props, word: pickPastWord(e.props.word) } }));
};
