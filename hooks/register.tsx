import type { EngineInterface, On, Register } from 'claude-code';

import {
  callPartner,
  createPartner,
  hatchPartner,
  measurePartner,
  nameForm,
  reactPartner,
  selectFrame,
  type Partner
} from '../src/partner.ts';
import { DEFAULT_LINE, findLine, LINES, STAGES, type Line } from '../src/roster.ts';
import { encodeFrame, encodePixels, FRAME_SIZE, SPRITE_ROWS, type Pixel } from '../src/sprite.ts';
import { SHEETS } from '../src/sprites.generated.ts';
import {
  createDigivolution,
  createHatching,
  findScenePixels,
  type Scene
} from '../src/transition.ts';

const RASTER_KEY = 'partner';
const STORE_KEY = 'partner';
const TICK_MS = 100;
const BEAT_TICKS = 5;
const MEASURE_EVERY_TICKS = 20;
const TURN_TICKS = 80;
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
const encodedScenes = new WeakMap<Pixel[][], string>();
const encodedFrames = new Map<string, string>();

function countBeats(): number {
  return Math.floor(tick / BEAT_TICKS);
}

function createTransition(source: Partner, target: Partner): Scene | null {
  const before = SHEETS[source.line.forms[source.stage]];
  const after = SHEETS[target.line.forms[target.stage]];
  if (before === undefined || after === undefined) return null;
  if (source.stage === 'Digitama') return createHatching(before, after);
  const isRising = STAGES.indexOf(target.stage) > STAGES.indexOf(source.stage);
  return createDigivolution(before, after, isRising);
}

function startScene(source: Partner, target: Partner): void {
  scene = createTransition(source, target);
  sceneStart = tick;
  sceneTarget = target;
}

function changePartner(changed: Partner): void {
  if (changed.stage !== partner.stage && scene === null) startScene(partner, changed);
  partner = changed;
}

function advanceScene(): void {
  if (scene === null || findScenePixels(scene, tick - sceneStart) !== null) return;
  const reached = sceneTarget;
  scene = null;
  sceneTarget = null;
  if (reached !== null && reached.stage !== partner.stage) startScene(reached, partner);
}

async function readSavedLine(engine: EngineInterface): Promise<Line> {
  const saved: unknown = await engine.store.get(STORE_KEY).catch(() => null);
  return (typeof saved === 'string' ? findLine(saved) : null) ?? DEFAULT_LINE;
}

async function hatchSavedPartner(engine: EngineInterface): Promise<void> {
  partner = createPartner(await readSavedLine(engine));
  scene = null;
  sceneTarget = null;
  percent = 0;
  sentCells = null;
  engine.ui.invalidate('ui.render');
}

function encodeScenePixels(pixels: Pixel[][]): string {
  const cached = encodedScenes.get(pixels);
  if (cached !== undefined) return cached;
  const cells = encodePixels(pixels);
  encodedScenes.set(pixels, cells);
  return cells;
}

function encodeCells(): string {
  const scenePixels = scene === null ? null : findScenePixels(scene, tick - sceneStart);
  if (scenePixels !== null) return encodeScenePixels(scenePixels);
  const form = partner.line.forms[partner.stage];
  const frame = selectFrame(partner, countBeats());
  const isMirrored = Math.floor(tick / TURN_TICKS) % 2 === 1;
  const key = `${form}:${frame}:${isMirrored}`;
  const cached = encodedFrames.get(key);
  if (cached !== undefined) return cached;
  const sheet = SHEETS[form];
  if (sheet === undefined) throw new Error(`No sprite for ${nameForm(partner)}`);
  const cells = encodeFrame(sheet, frame, isMirrored);
  encodedFrames.set(key, cells);
  return cells;
}

async function measureContext(engine: EngineInterface): Promise<void> {
  const { context } = await engine.session.usage();
  percent = context.percent ?? percent;
  changePartner(measurePartner(partner, percent));
}

async function blitFrame(engine: EngineInterface): Promise<void> {
  if (bandId === null) return;
  const cells = encodeCells();
  if (cells === sentCells) return;
  sentCells = cells;
  const result = await engine.ui.blit({ requestId: bandId, key: RASTER_KEY, cells });
  if (result.deny === undefined) return;
  bandId = null;
  sentCells = null;
  engine.ui.invalidate('ui.render');
}

async function runTick(engine: EngineInterface): Promise<void> {
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
}

function registerLifecycleHooks(hook: On): void {
  hook('session.start', async (engine, event, next) => {
    await hatchSavedPartner(engine);
    await engine.command.register({
      name: 'agent-digitama',
      description: 'Choose the Digimon partner that hatches in new sessions',
      argumentHint: PARTNER_LIST
    });
    ticker?.cancel();
    ticker = engine.clock.every(TICK_MS, () => runTick(engine));
    return next(event);
  });

  hook('session.end', async (engine, event, next) => {
    if (event.reason === 'clear') await hatchSavedPartner(engine);
    return next(event);
  });

  hook('command.run', { command: 'agent-digitama' }, async (engine, event) => {
    const wanted = event.args.trim();
    if (wanted === '') {
      const current = (await readSavedLine(engine)).partner;
      return { text: `Partner: ${current}. Choose one of: ${PARTNER_LIST}.` };
    }
    const line = findLine(wanted);
    if (line === null) {
      return { text: `No partner named ${wanted}. Choose one of: ${PARTNER_LIST}.` };
    }
    await engine.store.set(STORE_KEY, line.partner);
    return { text: `Saved ${line.partner}. New sessions hatch its Digitama.` };
  });

  hook('prompt.submit', (engine, event, next) => {
    changePartner(hatchPartner(partner, percent));
    return next(event);
  });
}

function registerReactionHooks(hook: On): void {
  hook('tool.call', async (engine, event, next) => {
    if (event.agentId) return next(event);
    if (QUESTION_TOOLS.has(String(event.tool))) partner = callPartner(partner, true);
    const result = await next(event);
    const isFailure =
      result.isError === true && !next.signal.aborted && !REFUSED.test(String(result.text ?? ''));
    const answered = callPartner(partner, false);
    partner = isFailure ? reactPartner(answered, 'hurt', countBeats()) : answered;
    return result;
  });

  hook('turn.complete', async (engine, event, next) => {
    if (!event.agentId) {
      const answered = callPartner(partner, false);
      partner =
        event.reason === 'answer' ? reactPartner(answered, 'happy', countBeats()) : answered;
      await measureContext(engine);
    }
    return next(event);
  });

  hook('classic.PermissionRequest', async (engine, event, next) => {
    const result = await next(event);
    if (!result?.decision) partner = callPartner(partner, true);
    return result;
  });

  hook('classic.Notification', (engine, event, next) => {
    if (ALERT_NOTIFICATIONS.has(event.notification_type)) {
      partner = callPartner(partner, true);
    }
    return next(event);
  });
}

function registerBandHook(hook: On): void {
  hook('ui.render', { component: 'AbovePrompt' }, async (engine, event, next) => {
    const isRoomy = event.props.maxRows >= SPRITE_ROWS && event.props.bodyColumns > FRAME_SIZE;
    if (event.surface !== 'terminal' || event.props.hasSurvey || !isRoomy) {
      bandId = null;
      return next(event);
    }
    bandId = event.requestId;
    sentCells = encodeCells();
    const { Box, Raster } = engine.ui.resolve(event);
    const theirs = await next(event);
    const corner = (
      <Raster key={RASTER_KEY} columns={FRAME_SIZE} rows={SPRITE_ROWS} cells={sentCells} />
    );
    if (!theirs) return corner;
    return (
      <Box flexDirection="row" justifyContent="space-between">
        <Box flexGrow={1}>{theirs}</Box>
        {corner}
      </Box>
    );
  });
}

export const register: Register = (hook) => {
  registerLifecycleHooks(hook);
  registerReactionHooks(hook);
  registerBandHook(hook);
};
