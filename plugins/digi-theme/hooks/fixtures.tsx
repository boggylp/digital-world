import type { On } from 'claude-code';
import { mock, type Engine, type MockClock } from 'claude-code/testing';
import { readPartnerPixels } from '../src/animation.ts';
import { createPartner, type Reaction } from '../src/partner.ts';
import { DEFAULT_LINE } from '../src/roster.ts';
import {
  createImageSource,
  encodeImagePixels,
  placeDotPixels,
  readAnimationPixels,
  readPixels,
  type Pixel
} from '../src/sprite.ts';
import { SHEETS } from '../src/sprites.generated.ts';
import { UP_IMAGES } from '../src/up-images.generated.ts';

const UNEXPIRED_REACTION_TICK = 1000;

export const BAND = {
  plugin: 'digi-theme',
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

export const IMAGE_TERMINAL = { TERM_PROGRAM: 'ghostty' };

export const stubEngine = (
  hook: On,
  readPercent: () => number,
  environment: Record<string, string> = IMAGE_TERMINAL
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

export const startSession = async (
  engine: Engine,
  surface: 'terminal' | 'desktop' = 'terminal'
): Promise<void> => {
  await engine.session.start({ cwd: '/', surface, isInteractive: true });
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

export const readPartnerFrame = (
  form: string,
  tick: number,
  reaction: Reaction | null = null
): Pixel[][] => {
  const partner = {
    ...createPartner(DEFAULT_LINE),
    line: { ...DEFAULT_LINE, forms: { ...DEFAULT_LINE.forms, Rookie: form } },
    stage: 'Rookie' as const,
    reaction,
    reactionUntilTick: reaction === null ? 0 : UNEXPIRED_REACTION_TICK
  };
  return readPartnerPixels(partner, tick);
};

type ImageSource = ReturnType<typeof createImageSource>;

const drawPixels = (pixels: Pixel[][]): ImageSource => createImageSource(encodeImagePixels(pixels));

export const encodePartner = (
  form: string,
  tick: number,
  reaction: Reaction | null = null
): ImageSource => drawPixels(readPartnerFrame(form, tick, reaction));

export const encodeUpFrame = (form: string, index: number): ImageSource => {
  const animation = UP_IMAGES[form];
  const frame = animation?.walking[index];
  if (animation === undefined || frame === undefined) {
    throw new Error(`Missing UP frame ${form}:${index}`);
  }
  return drawPixels(readAnimationPixels(animation, frame));
};

export const encodeEgg = (form: string, frame: number): ImageSource => {
  const sheet = SHEETS[form];
  if (sheet === undefined) throw new Error(`Missing egg ${form}`);
  return drawPixels(placeDotPixels(readPixels(sheet, frame, false)));
};

export const AFTER_SCENES_MS = 6000;

export const hatchAgumon = async (
  engine: Engine,
  clock: MockClock,
  surface: 'terminal' | 'desktop' = 'terminal'
): Promise<void> => {
  await startSession(engine, surface);
  await engine.prompt.submit({ text: 'hello', wait: false, origin: { kind: 'composer' } });
  await clock.advance(AFTER_SCENES_MS);
};

export const readBandImage = async (engine: Engine): Promise<unknown> => {
  const band = await engine.ui.mount(BAND);
  const image = await band.find({ type: 'Image', key: 'partner' });
  await band.unmount();
  return image?.props.source;
};

export const DESKTOP_BAND = { ...BAND, surface: 'desktop' } as const;

export const readBandSvg = async (engine: Engine): Promise<unknown> => {
  const band = await engine.ui.mount(DESKTOP_BAND);
  const svg = await band.find({ type: 'Svg' });
  await band.unmount();
  return svg?.props.source;
};
