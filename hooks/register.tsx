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
import { DEFAULT_LINE, findLine, LINES, type Line } from '../src/roster.ts';
import { encodeFrame, FRAME_SIZE, SPRITE_ROWS } from '../src/sprite.ts';
import { SHEETS } from '../src/sprites.generated.ts';

const RASTER_KEY = 'partner';
const STORE_KEY = 'partner';
const TICK_MS = 500;
const MEASURE_EVERY_TICKS = 4;
const TURN_TICKS = 16;
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
let label = '';
let ticker: { cancel: () => void } | null = null;

async function readSavedLine(engine: EngineInterface): Promise<Line> {
  const saved: unknown = await engine.store.get(STORE_KEY).catch(() => null);
  return (typeof saved === 'string' ? findLine(saved) : null) ?? DEFAULT_LINE;
}

async function hatchSavedPartner(engine: EngineInterface): Promise<void> {
  partner = createPartner(await readSavedLine(engine));
  percent = 0;
  sentCells = null;
  engine.ui.invalidate('ui.render');
}

function encodeCells(): string {
  const sheet = SHEETS[partner.line.forms[partner.stage]];
  if (sheet === undefined) throw new Error(`No sprite for ${nameForm(partner)}`);
  const isMirrored = Math.floor(tick / TURN_TICKS) % 2 === 1;
  return encodeFrame(sheet, selectFrame(partner, tick), isMirrored);
}

function describePartner(): string {
  return partner.isCalling ? `${nameForm(partner)} !` : nameForm(partner);
}

function changePartner(engine: EngineInterface, changed: Partner): void {
  partner = changed;
  if (describePartner() !== label) engine.ui.invalidate('ui.render');
}

async function measureContext(engine: EngineInterface): Promise<void> {
  const { context } = await engine.session.usage();
  percent = context.percent ?? percent;
  changePartner(engine, measurePartner(partner, percent));
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

function registerLifecycleHooks(hook: On): void {
  hook('session.start', async (engine, event, next) => {
    await hatchSavedPartner(engine);
    await engine.command.register({
      name: 'agent-digitama',
      description: 'Choose the Digimon partner that hatches in new sessions',
      argumentHint: PARTNER_LIST
    });
    ticker?.cancel();
    ticker = engine.clock.every(TICK_MS, async () => {
      tick += 1;
      if (tick % MEASURE_EVERY_TICKS === 0) await measureContext(engine);
      await blitFrame(engine);
    });
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
    changePartner(engine, hatchPartner(partner, percent));
    return next(event);
  });
}

function registerReactionHooks(hook: On): void {
  hook('tool.call', async (engine, event, next) => {
    if (event.agentId) return next(event);
    if (QUESTION_TOOLS.has(String(event.tool))) changePartner(engine, callPartner(partner, true));
    const result = await next(event);
    const isFailure =
      result.isError === true && !next.signal.aborted && !REFUSED.test(String(result.text ?? ''));
    const answered = callPartner(partner, false);
    changePartner(engine, isFailure ? reactPartner(answered, 'hurt', tick) : answered);
    return result;
  });

  hook('turn.complete', async (engine, event, next) => {
    if (!event.agentId) {
      const answered = callPartner(partner, false);
      changePartner(
        engine,
        event.reason === 'answer' ? reactPartner(answered, 'happy', tick) : answered
      );
      await measureContext(engine);
    }
    return next(event);
  });

  hook('classic.PermissionRequest', async (engine, event, next) => {
    const result = await next(event);
    if (!result?.decision) changePartner(engine, callPartner(partner, true));
    return result;
  });

  hook('classic.Notification', (engine, event, next) => {
    if (ALERT_NOTIFICATIONS.has(event.notification_type)) {
      changePartner(engine, callPartner(partner, true));
    }
    return next(event);
  });
}

function registerBandHook(hook: On): void {
  hook('ui.render', { component: 'AbovePrompt' }, async (engine, event, next) => {
    label = describePartner();
    const isRoomy =
      event.props.maxRows >= SPRITE_ROWS && event.props.bodyColumns > FRAME_SIZE + label.length;
    if (event.surface !== 'terminal' || event.props.hasSurvey || !isRoomy) {
      bandId = null;
      return next(event);
    }
    bandId = event.requestId;
    sentCells = encodeCells();
    const { Box, Raster, Text } = engine.ui.resolve(event);
    const theirs = await next(event);
    const corner = (
      <Box flexDirection="row" alignItems="flex-end">
        <Text color={partner.isCalling ? 'red' : undefined} dimColor={!partner.isCalling}>
          {label}{' '}
        </Text>
        <Raster key={RASTER_KEY} columns={FRAME_SIZE} rows={SPRITE_ROWS} cells={sentCells} />
      </Box>
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
