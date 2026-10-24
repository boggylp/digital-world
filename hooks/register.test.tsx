import type { On } from 'claude-code';
import { expect, mock, test } from 'claude-code/testing';
import type { Engine, MockClock } from 'claude-code/testing';

import { encodeFrame, FRAMES } from '../src/sprite.ts';
import { SHEETS } from '../src/sprites.generated.ts';

const BAND = {
  plugin: 'agent-digitama',
  component: 'AbovePrompt',
  requestId: 'band',
  surface: 'terminal',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 20,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 20 },
    view: {}
  }
} as const;

function stubEngine(hook: On, contextPercent: number): MockClock {
  hook('command.register', () => ({ value: { command: 'agent-digitama' } }));
  hook('session.start', (_engine, event) => ({ cwd: event.cwd }));
  hook('prompt.submit', (_engine, event) => ({ text: event.text }));
  hook('ui.render', (engine, event) => {
    const { Text } = engine.ui.resolve(event);
    return <Text>prompt hint</Text>;
  });
  hook('session.usage', () => ({
    value: { startedAt: 0, context: { window: 200_000, percent: contextPercent }, rateLimits: [] }
  }));
  return mock.clock(hook);
}

async function startSession(engine: Engine): Promise<void> {
  await engine.session.start({ cwd: '/', surface: 'terminal', isInteractive: true });
}

async function runCommand(engine: Engine, args: string): Promise<string | undefined> {
  const result = await engine.command.run({
    command: 'agent-digitama',
    args,
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 100 }
  });
  return result.text;
}

function encodeFrames(form: string, frames: readonly number[]): string[] {
  const sheet = SHEETS[form];
  return sheet === undefined ? [] : frames.map((frame) => encodeFrame(sheet, frame, false));
}

async function hatchAgumon(engine: Engine, clock: MockClock): Promise<void> {
  await startSession(engine);
  await engine.prompt.submit({ text: 'hello', wait: false, origin: { kind: 'composer' } });
  await clock.advance(2000);
}

async function readBandCells(engine: Engine): Promise<unknown> {
  const band = await engine.ui.mount(BAND);
  const raster = await band.find({ type: 'Raster', key: 'partner' });
  await band.unmount();
  return raster?.props.cells;
}

test('agent-digitama_NoSavedPartner_ShowsAgumon', async (engine, hook) => {
  stubEngine(hook, 0);
  mock.store(hook);
  await startSession(engine);

  expect(await runCommand(engine, '')).toContain('Partner: Agumon.');
});

test('agent-digitama_SaveVeemon_IsTheSavedPartner', async (engine, hook) => {
  stubEngine(hook, 0);
  mock.store(hook);
  await startSession(engine);
  await runCommand(engine, 'veemon');

  expect(await runCommand(engine, '')).toContain('Partner: Veemon.');
});

test('agent-digitama_UnknownPartner_KeepsSavedPartner', async (engine, hook) => {
  stubEngine(hook, 0);
  mock.store(hook, { partner: 'Gabumon' });
  await startSession(engine);
  await runCommand(engine, 'Pikachu');

  expect(await runCommand(engine, '')).toContain('Partner: Gabumon.');
});

test('agent-digitama_UnknownPartner_ListsChoices', async (engine, hook) => {
  stubEngine(hook, 0);
  mock.store(hook);
  await startSession(engine);

  expect(await runCommand(engine, 'Pikachu')).toContain('Choose one of: Agumon, Gabumon');
});

test('band_CorruptSavedPartner_HatchesAgumon', async (engine, hook) => {
  const clock = stubEngine(hook, 12);
  mock.store(hook, { partner: 42 });
  await startSession(engine);
  await engine.prompt.submit({ text: 'hello', wait: false, origin: { kind: 'composer' } });
  await clock.advance(2000);

  expect(encodeFrames('Agumon', FRAMES.walk)).toContain(await readBandCells(engine));
});

test('band_BeforeFirstPrompt_ShowsDigitama', async (engine, hook) => {
  stubEngine(hook, 0);
  mock.store(hook, { partner: 'Veemon' });
  await startSession(engine);

  expect(encodeFrames('V_Digitama', FRAMES.egg)).toContain(await readBandCells(engine));
});

test('band_SavedVeemon_HatchesChicomon', async (engine, hook) => {
  stubEngine(hook, 0);
  mock.store(hook, { partner: 'Veemon' });
  await startSession(engine);
  await engine.prompt.submit({ text: 'hello', wait: false, origin: { kind: 'composer' } });

  expect(encodeFrames('Chicomon', FRAMES.walk)).toContain(await readBandCells(engine));
});

test('band_UnreadableStore_HatchesAgumon', async (engine, hook) => {
  const clock = stubEngine(hook, 12);
  hook('store.get', () => {
    throw new Error('unreadable store');
  });
  await hatchAgumon(engine, clock);

  expect(encodeFrames('Agumon', FRAMES.walk)).toContain(await readBandCells(engine));
});

test('band_ClearAfterHatching_ShowsDigitamaAgain', async (engine, hook) => {
  const clock = stubEngine(hook, 12);
  mock.store(hook);
  hook('session.end', (_engine, event) => ({ sessionId: event.sessionId }));
  await hatchAgumon(engine, clock);
  await engine.session.end({
    reason: 'clear',
    sessionId: 'session-1',
    resume: { id: 'session-1' }
  });

  expect(encodeFrames('Agu_Digitama', FRAMES.egg)).toContain(await readBandCells(engine));
});

test('band_FailedToolCall_ShowsHurtFrame', async (engine, hook) => {
  const clock = stubEngine(hook, 12);
  mock.store(hook);
  hook('tool.call', () => ({ isError: true, result: 'Exit code 3', text: 'Exit code 3' }));
  await hatchAgumon(engine, clock);
  await engine.tool.call({ tool: 'Bash', command: 'exit 3' });

  expect(encodeFrames('Agumon', FRAMES.hurt)).toContain(await readBandCells(engine));
});

test('band_TurnComplete_ShowsHappyFrame', async (engine, hook) => {
  const clock = stubEngine(hook, 12);
  mock.store(hook);
  hook('turn.complete', (_engine, event) => ({ text: event.answer }));
  await hatchAgumon(engine, clock);
  await engine.turn.complete({
    answer: 'done',
    durationMs: 1000,
    isAborted: false,
    turnId: 'turn-1',
    reason: 'answer'
  });

  expect(encodeFrames('Agumon', FRAMES.happy)).toContain(await readBandCells(engine));
});

test('band_PermissionPrompt_CallsForYou', async (engine, hook) => {
  const clock = stubEngine(hook, 12);
  mock.store(hook);
  hook('classic.Notification', () => ({}));
  await hatchAgumon(engine, clock);
  await engine.classic.Notification({
    message: 'Claude needs permission',
    notification_type: 'permission_prompt'
  });

  expect(encodeFrames('Agumon', FRAMES.angry)).toContain(await readBandCells(engine));
});
