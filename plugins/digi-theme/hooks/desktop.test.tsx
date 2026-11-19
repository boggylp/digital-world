import { expect, mock, test } from 'claude-code/testing';
import { readPartnerPixels } from '../src/animation.ts';
import { createPartner } from '../src/partner.ts';
import { DEFAULT_LINE } from '../src/roster.ts';
import { encodeSvgPixels } from '../src/sprite.ts';
import {
  DESKTOP_BAND,
  hatchAgumon,
  readBandSvg,
  readPartnerFrame,
  startSession,
  stubEngine
} from './fixtures.tsx';

const BEAT_MS = 500;

const encodeAgumon = (tick: number): string =>
  encodeSvgPixels(readPartnerFrame('Agumon', tick, null, true));

test('desktopBand_BeforeFirstPrompt_ShowsDigitama', async (engine, hook) => {
  stubEngine(hook, () => 0);
  mock.store(hook);
  await startSession(engine, 'desktop');
  const egg = readPartnerPixels(createPartner(DEFAULT_LINE), 0, true);

  expect(await readBandSvg(engine)).toBe(encodeSvgPixels(egg));
});

test('desktopBand_HatchedAgumon_DrawsDetailedSpriteAsSvg', async (engine, hook) => {
  const clock = stubEngine(hook, () => 12);
  mock.store(hook);
  await hatchAgumon(engine, clock, 'desktop');
  const band = await engine.ui.mount(DESKTOP_BAND);
  const svg = await band.find({ type: 'Svg' });
  await band.unmount();

  expect(svg?.props).toMatchObject({ source: encodeAgumon(60), width: 64, height: 64 });
});

test('desktopBand_NextBeat_RedrawsNextFrame', async (engine, hook) => {
  const clock = stubEngine(hook, () => 12);
  mock.store(hook);
  await hatchAgumon(engine, clock, 'desktop');
  const band = await engine.ui.mount(DESKTOP_BAND);
  await clock.advance(BEAT_MS);
  const svg = await band.find({ type: 'Svg' });
  await band.unmount();

  expect(encodeAgumon(65)).not.toBe(encodeAgumon(60));
  expect(svg?.props.source).toBe(encodeAgumon(65));
});

test('desktopBand_Collapsed_HidesPartner', async (engine, hook) => {
  const clock = stubEngine(hook, () => 12);
  mock.store(hook);
  await hatchAgumon(engine, clock, 'desktop');
  const band = await engine.ui.mount({
    ...DESKTOP_BAND,
    props: { ...DESKTOP_BAND.props, isCollapsed: true }
  });

  expect(await band.find({ type: 'Svg' })).toBeUndefined();
  await band.unmount();
});

test('desktopBand_Survey_HidesPartner', async (engine, hook) => {
  const clock = stubEngine(hook, () => 12);
  mock.store(hook);
  await hatchAgumon(engine, clock, 'desktop');
  const band = await engine.ui.mount({
    ...DESKTOP_BAND,
    props: { ...DESKTOP_BAND.props, hasSurvey: true }
  });

  expect(await band.find({ type: 'Svg' })).toBeUndefined();
  await band.unmount();
});
