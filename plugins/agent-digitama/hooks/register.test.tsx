import { expect, mock, test } from 'claude-code/testing';
import {
  BAND,
  AFTER_SCENES_MS,
  stubEngine,
  startSession,
  runCommand,
  encodePartner,
  encodeUpFrame,
  encodeEgg,
  hatchAgumon,
  readBandCells
} from './fixtures.tsx';

test('agent-digitama_NoSavedPartner_ShowsAgumon', async (engine, hook) => {
  stubEngine(hook, () => 0);
  mock.store(hook);
  await startSession(engine);

  expect(await runCommand(engine, '')).toContain('Partner: Agumon.');
});

test('agent-digitama_SaveVeemon_IsTheSavedPartner', async (engine, hook) => {
  stubEngine(hook, () => 0);
  mock.store(hook);
  await startSession(engine);
  await runCommand(engine, 'veemon');

  expect(await runCommand(engine, '')).toContain('Partner: Veemon.');
});

test('agent-digitama_UnknownPartner_KeepsSavedPartner', async (engine, hook) => {
  stubEngine(hook, () => 0);
  mock.store(hook, { partner: 'Gabumon' });
  await startSession(engine);
  await runCommand(engine, 'Pikachu');

  expect(await runCommand(engine, '')).toContain('Partner: Gabumon.');
});

test('agent-digitama_UnknownPartner_ListsChoices', async (engine, hook) => {
  stubEngine(hook, () => 0);
  mock.store(hook);
  await startSession(engine);

  expect(await runCommand(engine, 'Pikachu')).toContain('Choose one of: Agumon, Gabumon');
});

test('band_CorruptSavedPartner_HatchesAgumon', async (engine, hook) => {
  const clock = stubEngine(hook, () => 12);
  mock.store(hook, { partner: 42 });
  await startSession(engine);
  await engine.prompt.submit({ text: 'hello', wait: false, origin: { kind: 'composer' } });
  await clock.advance(AFTER_SCENES_MS);

  expect(await readBandCells(engine)).toBe(encodePartner('Agumon', 60));
});

test('band_BeforeFirstPrompt_ShowsDigitama', async (engine, hook) => {
  stubEngine(hook, () => 0);
  mock.store(hook, { partner: 'Veemon' });
  await startSession(engine);

  expect(await readBandCells(engine)).toBe(encodeEgg('V_Digitama', 0));
});

test('band_SavedVeemon_HatchesChicomon', async (engine, hook) => {
  const clock = stubEngine(hook, () => 0);
  mock.store(hook, { partner: 'Veemon' });
  await startSession(engine);
  await engine.prompt.submit({ text: 'hello', wait: false, origin: { kind: 'composer' } });
  await clock.advance(AFTER_SCENES_MS);

  expect(await readBandCells(engine)).toBe(encodePartner('Chicomon', 60));
});

test('band_UnreadableStore_HatchesAgumon', async (engine, hook) => {
  const clock = stubEngine(hook, () => 12);
  hook('store.get', () => {
    throw new Error('unreadable store');
  });
  await hatchAgumon(engine, clock);

  expect(await readBandCells(engine)).toBe(encodePartner('Agumon', 60));
});

test('band_ClearAfterHatching_ShowsDigitamaAgain', async (engine, hook) => {
  const clock = stubEngine(hook, () => 12);
  mock.store(hook);
  hook('session.end', (_engine, event) => ({ sessionId: event.sessionId }));
  await hatchAgumon(engine, clock);
  await engine.session.end({
    reason: 'clear',
    sessionId: 'session-1',
    resume: { id: 'session-1' }
  });

  expect(await readBandCells(engine)).toBe(encodeEgg('Agu_Digitama', 0));
});

test('band_FailedToolCall_FlashesRed', async (engine, hook) => {
  const clock = stubEngine(hook, () => 12);
  mock.store(hook);
  hook('tool.call', () => ({ isError: true, result: 'Exit code 3', text: 'Exit code 3' }));
  await hatchAgumon(engine, clock);
  await engine.tool.call({ tool: 'Bash', command: 'exit 3' });

  expect(await readBandCells(engine)).toBe(encodePartner('Agumon', 60, 'hurt'));
});

test('band_TurnComplete_Hops', async (engine, hook) => {
  const clock = stubEngine(hook, () => 12);
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

  expect(await readBandCells(engine)).toBe(encodePartner('Agumon', 60, 'happy'));
});

test('band_PermissionPrompt_PulsesAmber', async (engine, hook) => {
  const clock = stubEngine(hook, () => 12);
  mock.store(hook);
  hook('classic.Notification', () => ({}));
  await hatchAgumon(engine, clock);
  await engine.classic.Notification({
    message: 'Claude needs permission',
    notification_type: 'permission_prompt'
  });

  expect(await readBandCells(engine)).toBe(encodePartner('Agumon', 60, 'angry'));
});

test('band_Hatching_ShowsCrackedEgg', async (engine, hook) => {
  const clock = stubEngine(hook, () => 0);
  mock.store(hook);
  await startSession(engine);
  await engine.prompt.submit({ text: 'hello', wait: false, origin: { kind: 'composer' } });
  await clock.advance(1100);

  expect(await readBandCells(engine)).toBe(encodeEgg('Agu_Digitama', 2));
});

test('band_SavedGabumon_EvolvesIntoUpGarurumon', async (engine, hook) => {
  const clock = stubEngine(hook, () => 40);
  mock.store(hook, { partner: 'Gabumon' });
  await hatchAgumon(engine, clock);

  expect(await readBandCells(engine)).toBe(encodeUpFrame('Garurumon', 6));
});

test('band_NarrowTerminal_HidesPartner', async (engine, hook) => {
  stubEngine(hook, () => 0);
  mock.store(hook);
  await startSession(engine);
  const band = await engine.ui.mount({ ...BAND, props: { ...BAND.props, bodyColumns: 23 } });

  expect(await band.find({ type: 'Raster', key: 'partner' })).toBeUndefined();
});

test('band_CompactionFromChampion_SettlesOnAgumon', async (engine, hook) => {
  let contextPercent = 40;
  const clock = stubEngine(hook, () => contextPercent);
  mock.store(hook);
  await hatchAgumon(engine, clock);
  contextPercent = 12;
  await clock.advance(AFTER_SCENES_MS);

  expect(await readBandCells(engine)).toBe(encodePartner('Agumon', 120));
});

test('band_ChampionSetTo50_StaysAgumonAt40', { options: { champion_percent: 50, ultimate_percent: 60, mega_percent: 80 } }, async (engine, hook) => {
  const clock = stubEngine(hook, () => 40);
  mock.store(hook);
  await hatchAgumon(engine, clock);

  expect(await readBandCells(engine)).toBe(encodePartner('Agumon', 60));
});

test('band_MegaBelowUltimate_UsesDefaultStages', { options: { champion_percent: 45, ultimate_percent: 60, mega_percent: 20 } }, async (engine, hook) => {
  const clock = stubEngine(hook, () => 40);
  mock.store(hook);
  await hatchAgumon(engine, clock);

  expect(await readBandCells(engine)).toBe(encodeUpFrame('Greymon', 6));
});
