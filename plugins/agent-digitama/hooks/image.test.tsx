import { expect, mock, test, type Engine } from 'claude-code/testing';
import { readPartnerPixels, readStillPixels } from '../src/animation.ts';
import { createPartner } from '../src/partner.ts';
import { DEFAULT_LINE } from '../src/roster.ts';
import { encodeImagePixels, SPRITE_COLUMNS, SPRITE_ROWS } from '../src/sprite.ts';
import {
  BAND,
  stubEngine,
  startSession,
  hatchAgumon,
  encodePartner
} from './fixtures.tsx';

const readBandImage = async (engine: Engine): Promise<unknown> => {
  const band = await engine.ui.mount(BAND);
  const image = await band.find({ type: 'Image', key: 'partner' });
  await band.unmount();
  return image?.props.source;
};

test('band_Ghostty_RendersImagePixels', async (engine, hook) => {
  stubEngine(hook, () => 0, { TERM_PROGRAM: 'ghostty' });
  mock.store(hook);
  await startSession(engine);

  expect(await readBandImage(engine)).toEqual({
    rgba: encodeImagePixels(readStillPixels('Agu_Digitama', true)),
    width: 80,
    height: 80
  });
});

test('band_ExplicitImageSupport_RendersImagePixels', async (engine, hook) => {
  stubEngine(hook, () => 0, { CLAUDE_CODE_FORCE_TERMINAL_IMAGES: '1' });
  mock.store(hook);
  await startSession(engine);

  expect(await readBandImage(engine)).toEqual({
    rgba: encodeImagePixels(readStillPixels('Agu_Digitama', true)),
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
    rgba: encodeImagePixels(readPartnerPixels(partner, 60, true)),
    width: 80,
    height: 80
  });
});

test('band_DeniedImageDuringHatching_RendersTextCellBaby', async (engine, hook) => {
  const clock = stubEngine(hook, () => 0, { TERM_PROGRAM: 'ghostty' });
  mock.store(hook);
  hook('ui.blit', () => ({ value: { deny: 'Images unavailable' } }));
  await startSession(engine);
  await engine.prompt.submit({ text: 'hello', wait: false, origin: { kind: 'composer' } });
  const band = await engine.ui.mount(BAND);
  await clock.advance(100);
  await band.unmount();
  const textBand = await engine.ui.mount(BAND);
  const raster = await textBand.find({ type: 'Raster', key: 'partner' });
  await textBand.unmount();

  expect(raster?.props).toMatchObject({ columns: SPRITE_COLUMNS, rows: SPRITE_ROWS, cells: encodePartner('Botamon', 1) });
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
      rgba: encodeImagePixels(readPartnerPixels(partner, 62, true)),
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
