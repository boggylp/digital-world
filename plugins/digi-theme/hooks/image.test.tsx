import { expect, mock, test } from 'claude-code/testing';
import { readPartnerPixels, readStillPixels } from '../src/animation.ts';
import { createPartner } from '../src/partner.ts';
import { DEFAULT_LINE } from '../src/roster.ts';
import { encodeImagePixels, IMAGE_COLUMNS, IMAGE_ROWS } from '../src/sprite.ts';
import {
  BAND,
  stubEngine,
  startSession,
  hatchAgumon,
  readBandImage
} from './fixtures.tsx';

test('band_Ghostty_RendersImagePixels', async (engine, hook) => {
  stubEngine(hook, () => 0, { TERM_PROGRAM: 'ghostty' });
  mock.store(hook);
  await startSession(engine);

  expect(await readBandImage(engine)).toEqual({
    rgba: encodeImagePixels(readStillPixels('Agu_Digitama')),
    width: 80,
    height: 80
  });
});

test('band_ExplicitImageSupport_RendersImagePixels', async (engine, hook) => {
  stubEngine(hook, () => 0, { CLAUDE_CODE_FORCE_TERMINAL_IMAGES: '1' });
  mock.store(hook);
  await startSession(engine);

  expect(await readBandImage(engine)).toEqual({
    rgba: encodeImagePixels(readStillPixels('Agu_Digitama')),
    width: 80,
    height: 80
  });
});

test('band_ImageHatching_ReachesDetailedAgumon', async (engine, hook) => {
  const clock = stubEngine(hook, () => 12, { TERM_PROGRAM: 'ghostty' });
  mock.store(hook);
  await hatchAgumon(engine, clock);
  const partner = { ...createPartner(DEFAULT_LINE), stage: 'Rookie' as const };

  expect(await readBandImage(engine)).toEqual({
    rgba: encodeImagePixels(readPartnerPixels(partner, 60)),
    width: 80,
    height: 80
  });
});

test('band_TerminalWithoutImageSupport_HidesPartner', async (engine, hook) => {
  stubEngine(hook, () => 0, {});
  mock.store(hook);
  await startSession(engine);

  expect(await readBandImage(engine)).toBeUndefined();
});

test('band_DeniedFirstImage_HidesPartner', async (engine, hook) => {
  const clock = stubEngine(hook, () => 0, { TERM_PROGRAM: 'ghostty' });
  mock.store(hook);
  hook('ui.blit', () => ({ value: { deny: 'Images unavailable' } }));
  await startSession(engine);
  const band = await engine.ui.mount(BAND);
  await clock.advance(100);
  await band.unmount();

  expect(await readBandImage(engine)).toBeUndefined();
});

test('band_DeniedImageAfterOneWasDrawn_KeepsImagePartner', async (engine, hook) => {
  const clock = stubEngine(hook, () => 12, { TERM_PROGRAM: 'ghostty' });
  mock.store(hook);
  let reply: { deny?: string } = {};
  hook('ui.blit', () => ({ value: reply }));
  await hatchAgumon(engine, clock);
  const band = await engine.ui.mount(BAND);
  await clock.advance(200);
  reply = { deny: 'Nothing of this plugin is mounted there' };
  await clock.advance(200);
  await band.unmount();
  const remounted = await engine.ui.mount(BAND);
  const image = await remounted.find({ type: 'Image', key: 'partner' });
  await remounted.unmount();

  expect(image?.props).toMatchObject({ columns: IMAGE_COLUMNS, rows: IMAGE_ROWS });
});

test('band_MountedImage_SendsDetailedAnimationUpdates', async (engine, hook) => {
  const clock = stubEngine(hook, () => 12, { TERM_PROGRAM: 'ghostty' });
  mock.store(hook);
  const updates: unknown[] = [];
  hook('ui.blit', (_engine, event) => {
    updates.push(event);
    return { value: {} };
  });
  await hatchAgumon(engine, clock);
  const band = await engine.ui.mount(BAND);
  await clock.advance(200);
  const partner = { ...createPartner(DEFAULT_LINE), stage: 'Rookie' as const };

  expect(updates.at(-1)).toEqual({
    requestId: 'band',
    key: 'partner',
    source: {
      rgba: encodeImagePixels(readPartnerPixels(partner, 62)),
      width: 80,
      height: 80
    }
  });
  await band.unmount();
});

test('band_ImageMode_FitsCompactViewport', async (engine, hook) => {
  stubEngine(hook, () => 0, { TERM_PROGRAM: 'ghostty' });
  mock.store(hook);
  await startSession(engine);
  const band = await engine.ui.mount({
    ...BAND,
    props: { ...BAND.props, bodyColumns: 8, maxRows: 4 }
  });

  const image = await band.find({ type: 'Image', key: 'partner' });

  expect(image?.props).toMatchObject({ columns: 8, rows: 4 });
});
