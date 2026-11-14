import type { EngineInterface, On, Register } from 'claude-code';

import {
  BEAT_TICKS,
  MS_PER_SECOND,
  readPartnerPixels,
  readStillPixels,
  TICKS_PER_SECOND
} from '../src/animation.ts';
import {
  callPartner,
  createPartner,
  DEFAULT_THRESHOLDS,
  hatchPartner,
  measurePartner,
  reactPartner,
  readThresholds,
  type Partner,
  type Thresholds
} from '../src/partner.ts';
import { DEFAULT_LINE, findLine, LINES, STAGES, type Line } from '../src/roster.ts';
import {
  createImageSource,
  encodeImagePixels,
  encodePixels,
  IMAGE_COLUMNS,
  IMAGE_ROWS,
  SPRITE_COLUMNS,
  SPRITE_ROWS,
  type Pixel
} from '../src/sprite.ts';
import { SHEETS } from '../src/sprites.generated.ts';
import {
  createDigivolution,
  createHatching,
  findScenePixels,
  type Scene
} from '../src/transition.ts';

const RASTER_KEY = 'partner';
const STORE_KEY = 'partner';
const MEASURE_EVERY_TICKS = 20;
const QUESTION_TOOLS = new Set(['AskUserQuestion', 'ExitPlanMode']);
const ALERT_NOTIFICATIONS = new Set([
  'permission_prompt',
  'worker_permission_prompt',
  'agent_needs_input',
  'elicitation_dialog'
]);
const REFUSED =
  /The user doesn't want to (?:proceed with this tool use|take this action)|\[Request interrupted by user/u;
const PARTNER_LIST = LINES.map((line) => line.partner).join(', ');

let partner: Partner = createPartner(DEFAULT_LINE);
let tick = 0;
let percent = 0;
let bandId: string | null = null;
let sentCells: string | null = null;
let ticker: { cancel: () => void } | null = null;
let scene: Scene | null = null;
let sceneStart = 0;
let sceneTarget: Partner | null = null;
let isTicking = false;
let isErrorLogged = false;
let isImage = false;
let thresholds: Thresholds | null = DEFAULT_THRESHOLDS;
const encodedScenes = new WeakMap<Pixel[][], string>();

const countBeats = (): number => Math.floor(tick / BEAT_TICKS);

const createTransition = (source: Partner, target: Partner): Scene => {
  const before = source.line.forms[source.stage];
  const after = readStillPixels(target.line.forms[target.stage], isImage);
  if (source.stage === 'Digitama') {
    const egg = SHEETS[before];
    if (egg === undefined) throw new Error(`No egg sprite for ${before}`);
    return createHatching(egg, after);
  }
  const isRising = STAGES.indexOf(target.stage) > STAGES.indexOf(source.stage);
  return createDigivolution(readStillPixels(before, isImage), after, isRising);
};

const startScene = (source: Partner, target: Partner): void => {
  scene = createTransition(source, target);
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

const encodeCells = (): string => {
  const scenePixels = scene === null ? null : findScenePixels(scene, tick - sceneStart);
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
  if (result.deny === undefined) return;
  if (isImage) {
    isImage = false;
    scene = null;
    sceneTarget = null;
  }
  bandId = null;
  sentCells = null;
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
  } catch (error) {
    if (!isErrorLogged) engine.ui.log(`agent-digitama: ${String(error)}`);
    isErrorLogged = true;
  } finally {
    isTicking = false;
  }
};

const registerLifecycleHooks = (hook: On): void => {
  hook('session.start', async (engine, event, proceed) => {
    isImage = await readImageSupport(engine);
    await hatchSavedPartner(engine);
    await engine.command.register({
      name: 'agent-digitama',
      description: 'Choose the Digimon partner that hatches in new sessions',
      argumentHint: PARTNER_LIST
    });
    ticker?.cancel();
    ticker = engine.clock.every(MS_PER_SECOND / TICKS_PER_SECOND, () => runTick(engine));
    return proceed(event);
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
    if (thresholds === null) engine.ui.toast('agent-digitama: stage percentages must be 1 to 100 and rise from Baby II to Mega, so the defaults apply.');
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

  hook('classic.Notification', (engine, event, proceed) => {
    if (ALERT_NOTIFICATIONS.has(event.notification_type)) {
      partner = callPartner(partner, true);
    }
    return proceed(event);
  });
};

const registerBandHook = (hook: On): void => {
  hook('ui.render', { component: 'AbovePrompt' }, async (engine, event, proceed) => {
    const theirs = await proceed(event);
    const columns = isImage ? IMAGE_COLUMNS : SPRITE_COLUMNS;
    const rows = isImage ? IMAGE_ROWS : SPRITE_ROWS;
    const isRoomy = event.props.maxRows >= rows && event.props.bodyColumns >= columns;
    if (event.surface !== 'terminal' || event.props.hasSurvey || !isRoomy) {
      bandId = null;
      return theirs;
    }
    bandId = event.requestId;
    const cells = encodeCells();
    sentCells = isImage ? null : cells;
    const { Box, Raster, Image } = engine.ui.resolve(event);
    const corner = isImage ? (
      <Image
        key={RASTER_KEY}
        columns={columns}
        rows={rows}
        source={createImageSource(cells)}
        alt={partner.line.forms[partner.stage]}
      />
    ) : (
      <Raster key={RASTER_KEY} columns={columns} rows={rows} cells={cells} />
    );
    if (!theirs) return corner;
    return (
      <Box flexDirection="row" justifyContent="space-between">
        <Box flexGrow={1}>{theirs}</Box>
        {corner}
      </Box>
    );
  });
};

export const register: Register = (hook, options) => {
  thresholds = readThresholds(options);
  registerLifecycleHooks(hook);
  registerReactionHooks(hook);
  registerBandHook(hook);
};
