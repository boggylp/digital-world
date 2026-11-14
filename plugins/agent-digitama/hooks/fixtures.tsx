import type { On } from 'claude-code';
import { mock, type Engine, type MockClock } from 'claude-code/testing';
import { readPartnerPixels } from '../src/animation.ts';
import { createPartner, type Reaction } from '../src/partner.ts';
import { DEFAULT_LINE } from '../src/roster.ts';
import { encodePixels, placeDotPixels, readAnimationPixels, readPixels } from '../src/sprite.ts';
import { SHEETS } from '../src/sprites.generated.ts';
import { UP_SPRITES } from '../src/up-sprites.generated.ts';

const UNEXPIRED_REACTION_TICK = 1000;

export const BAND = {
  plugin: 'agent-digitama',
  component: 'AbovePrompt',
  requestId: 'band',
  surface: 'terminal',
  props: {
    hasSurvey: false,
    isCollapsed: false,
    isWorking: false,
    maxRows: 20,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 20 },
    view: {}
  }
} as const;

export const stubEngine = (
  hook: On,
  readPercent: () => number,
  environment: Record<string, string> = {}
): MockClock => {
  mock.env(hook, environment);
  hook('command.register', () => ({ value: { command: 'agent-digitama' } }));
  hook('session.start', (_engine, event) => ({ cwd: event.cwd }));
  hook('prompt.submit', (_engine, event) => ({ text: event.text }));
  hook('ui.render', (engine, event) => {
    const { Text } = engine.ui.resolve(event);
    return <Text>prompt hint</Text>;
  });
  hook('session.usage', () => ({
    value: { startedAt: 0, context: { window: 200_000, percent: readPercent() }, rateLimits: [] }
  }));
  return mock.clock(hook);
};

export const startSession = async (engine: Engine): Promise<void> => {
  await engine.session.start({ cwd: '/', surface: 'terminal', isInteractive: true });
};

export const runCommand = async (engine: Engine, args: string): Promise<string | undefined> => {
  const result = await engine.command.run({
    command: 'agent-digitama',
    args,
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 100 }
  });
  return result.text;
};

export const encodePartner = (
  form: string,
  tick: number,
  reaction: Reaction | null = null
): string => {
  const partner = {
    ...createPartner(DEFAULT_LINE),
    line: { ...DEFAULT_LINE, forms: { ...DEFAULT_LINE.forms, Rookie: form } },
    stage: 'Rookie' as const,
    reaction,
    reactionUntilTick: reaction === null ? 0 : UNEXPIRED_REACTION_TICK
  };
  return encodePixels(readPartnerPixels(partner, tick));
};

export const encodeUpFrame = (form: string, index: number): string => {
  const animation = UP_SPRITES[form];
  const frame = animation?.walking[index];
  if (animation === undefined || frame === undefined) {
    throw new Error(`Missing UP frame ${form}:${index}`);
  }
  return encodePixels(readAnimationPixels(animation, frame));
};

export const encodeEgg = (form: string, frame: number): string => {
  const sheet = SHEETS[form];
  if (sheet === undefined) throw new Error(`Missing egg ${form}`);
  return encodePixels(placeDotPixels(readPixels(sheet, frame, false)));
};

export const AFTER_SCENES_MS = 6000;

export const hatchAgumon = async (engine: Engine, clock: MockClock): Promise<void> => {
  await startSession(engine);
  await engine.prompt.submit({ text: 'hello', wait: false, origin: { kind: 'composer' } });
  await clock.advance(AFTER_SCENES_MS);
};

export const readBandCells = async (engine: Engine): Promise<unknown> => {
  const band = await engine.ui.mount(BAND);
  const raster = await band.find({ type: 'Raster', key: 'partner' });
  await band.unmount();
  return raster?.props.cells;
};
