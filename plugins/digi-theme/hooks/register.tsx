import type { EngineInterface, MatchedHook, On, Register, RenderElement } from 'claude-code';

import { BEAT_TICKS, MS_PER_SECOND, readPartnerPixels, TICKS_PER_SECOND } from '../src/animation.ts';
import {
  callPartner,
  createPartner,
  DEFAULT_THRESHOLDS,
  hatchPartner,
  measurePartner,
  reactPartner,
  readThresholds,
  QUESTION_TOOLS,
  REFUSED,
  type Partner,
  type Thresholds
} from '../src/partner.ts';
import { DEFAULT_LINE, findLine, LINES, type Line } from '../src/roster.ts';
import {
  createImageSource,
  encodeImagePixels,
  encodePixels,
  encodeSvgPixels,
  type Pixel
} from '../src/sprite.ts';
import { drawCellCorner, drawSvgCorner, fitsCellCorner, placeCorner, RASTER_KEY } from './corner.tsx';
import { createTransition, findScenePixels, type Scene } from '../src/transition.ts';
import { LOOK } from './look.ts';
import { registerLook, TOUR_COMMAND, UNPAINTED } from './restyle.tsx';

const STORE_KEY = 'partner';
const MEASURE_EVERY_TICKS = 20;
const PARTNER_LIST = LINES.map((line) => line.partner).join(', ');

let partner: Partner = createPartner(DEFAULT_LINE);
let tick = 0;
let percent = 0;
let bandId: string | null = null;
let sentCells: string | null = null;
let sentSvg: string | null = null;
let ticker: { cancel: () => void } | null = null;
let scene: Scene | null = null;
let sceneStart = 0;
let sceneTarget: Partner | null = null;
let isTicking = false;
let isErrorLogged = false;
let isImage = false;
let hasDrawnImage = false;
let thresholds: Thresholds | null = DEFAULT_THRESHOLDS;
const encodedScenes = new WeakMap<Pixel[][], string>();

const countBeats = (): number => Math.floor(tick / BEAT_TICKS);

const startScene = (source: Partner, target: Partner): void => {
  scene = createTransition(source, target, isImage);
  sceneStart = tick;
  sceneTarget = target;
};

const changePartner = (changed: Partner): void => {
  if (changed.stage !== partner.stage && scene === null) startScene(partner, changed);
  partner = changed;
};

const advanceScene = (): void => {
  if (scene === null || findScenePixels(scene, tick - sceneStart) !== null) return;
  const reached = sceneTarget;
  scene = null;
  sceneTarget = null;
  if (reached !== null && reached.stage !== partner.stage) startScene(reached, partner);
};

const readImageSupport = async (engine: EngineInterface): Promise<boolean> => {
  const [terminal, kitty, forced] = await Promise.all([
    engine.env.get('TERM_PROGRAM'),
    engine.env.get('KITTY_WINDOW_ID'),
    engine.env.get('CLAUDE_CODE_FORCE_TERMINAL_IMAGES')
  ]);
  return (
    forced === '1' || Boolean(kitty) || ['ghostty', 'kitty', 'iTerm.app'].includes(terminal ?? '')
  );
};

const readSavedLine = async (engine: EngineInterface): Promise<Line> => {
  const saved: unknown = await engine.store.get(STORE_KEY).catch(() => null);
  return (typeof saved === 'string' ? findLine(saved) : null) ?? DEFAULT_LINE;
};

const hatchSavedPartner = async (engine: EngineInterface): Promise<void> => {
  partner = createPartner(await readSavedLine(engine));
  scene = null;
  sceneTarget = null;
  percent = 0;
  sentCells = null;
  engine.ui.invalidate('ui.render');
};

const encodeScenePixels = (pixels: Pixel[][]): string => {
  const cached = encodedScenes.get(pixels);
  if (cached !== undefined) return cached;
  const cells = isImage ? encodeImagePixels(pixels) : encodePixels(pixels);
  encodedScenes.set(pixels, cells);
  return cells;
};

const readScenePixels = (): Pixel[][] | null =>
  scene === null ? null : findScenePixels(scene, tick - sceneStart);

const readFramePixels = (): Pixel[][] => readScenePixels() ?? readPartnerPixels(partner, tick, isImage);

const encodeCells = (): string => {
  const scenePixels = readScenePixels();
  if (scenePixels !== null) return encodeScenePixels(scenePixels);
  const pixels = readPartnerPixels(partner, tick, isImage);
  return isImage ? encodeImagePixels(pixels) : encodePixels(pixels);
};

const measureContext = async (engine: EngineInterface): Promise<void> => {
  const { context } = await engine.session.usage();
  percent = context.percent ?? percent;
  changePartner(measurePartner(partner, percent, thresholds ?? DEFAULT_THRESHOLDS));
};

const blitFrame = async (engine: EngineInterface): Promise<void> => {
  if (bandId === null) return;
  const cells = encodeCells();
  if (cells === sentCells) return;
  sentCells = cells;
  const address = { requestId: bandId, key: RASTER_KEY };
  const result = await engine.ui.blit(
    isImage ? { ...address, source: createImageSource(cells) } : { ...address, cells }
  );
  hasDrawnImage ||= isImage && result.deny === undefined;
  if (result.deny === undefined) return;
  if (isImage && !hasDrawnImage) {
    isImage = false;
    scene = null;
    sceneTarget = null;
  }
  bandId = null;
  sentCells = null;
  engine.ui.invalidate('ui.render');
};

const redrawSvg = (engine: EngineInterface): void => {
  if (sentSvg === null || encodeSvgPixels(readFramePixels()) === sentSvg) return;
  engine.ui.invalidate('ui.render');
};

const runTick = async (engine: EngineInterface): Promise<void> => {
  if (isTicking) return;
  isTicking = true;
  try {
    tick += 1;
    if (tick % MEASURE_EVERY_TICKS === 0) await measureContext(engine);
    advanceScene();
    await blitFrame(engine);
    redrawSvg(engine);
  } catch (error) {
    if (!isErrorLogged) engine.ui.log(`digi-theme: ${String(error)}`);
    isErrorLogged = true;
  } finally {
    isTicking = false;
  }
};

const registerLifecycleHooks = (hook: On): void => {
  // The engine refuses a second unmatched session.start, so this one also starts the look.
  hook('session.start', async (engine, event, proceed) => {
    isImage = event.surface !== 'terminal' || (await readImageSupport(engine));
    hasDrawnImage = false;
    await hatchSavedPartner(engine);
    await engine.command.register({
      name: 'agent-digitama',
      description: 'Choose the Digimon partner that hatches in new sessions',
      argumentHint: PARTNER_LIST
    });
    ticker?.cancel();
    ticker = engine.clock.every(MS_PER_SECOND / TICKS_PER_SECOND, () => runTick(engine));
    if (UNPAINTED !== undefined) engine.ui.toast(`digi-theme: ${UNPAINTED}`);
    await engine.theme.set(LOOK).catch(() => {});
    const started = await proceed(event);
    await engine.command.register(TOUR_COMMAND).catch(() => {});
    return started;
  });

  hook('session.end', async (engine, event, proceed) => {
    if (event.reason === 'clear') await hatchSavedPartner(engine);
    return proceed(event);
  });

  hook('command.run', { command: 'agent-digitama' }, async (engine, event) => {
    const wanted = event.args.trim();
    if (wanted === '') {
      const { partner: current } = await readSavedLine(engine);
      return { text: `Partner: ${current}. Choose one of: ${PARTNER_LIST}.` };
    }
    const line = findLine(wanted);
    if (line === null) {
      return { text: `No partner named ${wanted}. Choose one of: ${PARTNER_LIST}.` };
    }
    await engine.store.set(STORE_KEY, line.partner);
    return { text: `Saved ${line.partner}. New sessions hatch its Digitama.` };
  });

  hook('prompt.submit', (engine, event, proceed) => {
    if (thresholds === null) engine.ui.toast('digi-theme: stage percentages must be 1 to 100 and rise from Baby II to Mega, so the defaults apply.');
    changePartner(hatchPartner(partner, percent, thresholds ?? DEFAULT_THRESHOLDS));
    return proceed(event);
  });
};

const registerReactionHooks = (hook: On): void => {
  hook('tool.call', async (engine, event, proceed) => {
    if (event.agentId) return proceed(event);
    if (QUESTION_TOOLS.has(String(event.tool))) partner = callPartner(partner, true);
    const result = await proceed(event);
    const isRefused = REFUSED.test(String(result.text ?? ''));
    const isFailure = result.isError === true && !proceed.signal.aborted && !isRefused;
    const answered = callPartner(partner, false);
    partner = isFailure ? reactPartner(answered, 'hurt', countBeats()) : answered;
    return result;
  });

  hook('turn.complete', async (engine, event, proceed) => {
    if (!event.agentId) {
      const answered = callPartner(partner, false);
      partner =
        event.reason === 'answer' ? reactPartner(answered, 'happy', countBeats()) : answered;
      await measureContext(engine);
    }
    return proceed(event);
  });

  hook('classic.PermissionRequest', async (engine, event, proceed) => {
    const result = await proceed(event);
    if (!result?.decision) partner = callPartner(partner, true);
    return result;
  });
};

type BandEvent = Parameters<MatchedHook<'ui.render', { component: 'AbovePrompt' }>>[1];

const readForm = (): string => partner.line.forms[partner.stage];

const drawTerminalCorner = (engine: EngineInterface, event: BandEvent): RenderElement | null => {
  sentSvg = null;
  if (event.surface !== 'terminal' || event.props.hasSurvey || !fitsCellCorner(isImage, event.props)) {
    bandId = null;
    return null;
  }
  bandId = event.requestId;
  const cells = encodeCells();
  sentCells = isImage ? null : cells;
  return drawCellCorner(engine.ui.resolve(event), { cells, isImage, alt: readForm() });
};

const drawDesktopCorner = (engine: EngineInterface, event: BandEvent): RenderElement | null => {
  bandId = null;
  if (event.surface !== 'desktop' || event.props.hasSurvey || event.props.isCollapsed) {
    sentSvg = null;
    return null;
  }
  const pixels = readFramePixels();
  sentSvg = encodeSvgPixels(pixels);
  return drawSvgCorner(engine.ui.resolve(event), { pixels, source: sentSvg, alt: readForm() });
};

const registerBandHook = (hook: On): void => {
  hook('ui.render', { component: 'AbovePrompt' }, async (engine, event, proceed) => {
    const theirs = await proceed(event);
    const corner =
      event.surface === 'terminal'
        ? drawTerminalCorner(engine, event)
        : drawDesktopCorner(engine, event);
    return corner === null ? theirs : placeCorner(engine.ui.resolve(event), theirs, corner);
  });
};

export const register: Register = (hook, options) => {
  thresholds = readThresholds(options);
  registerLifecycleHooks(hook);
  registerReactionHooks(hook);
  registerBandHook(hook);
  registerLook(hook);
};
