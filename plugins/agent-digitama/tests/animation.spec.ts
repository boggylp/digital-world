import { assert, describe, expect, test } from 'vitest';

import { readPartnerPixels, readStillPixels } from '../src/animation.ts';
import { callPartner, createPartner, reactPartner } from '../src/partner.ts';
import { findLine } from '../src/roster.ts';
import { placeDotPixels, readAnimationPixels, readPixels } from '../src/sprite.ts';
import { SHEETS } from '../src/sprites.generated.ts';
import { UP_SPRITES } from '../src/up-sprites.generated.ts';

function createGabumon() {
  const line = findLine('Gabumon');
  if (line === null) throw new Error('Gabumon line missing');
  return { ...createPartner(line), stage: 'Rookie' as const };
}

function readGabumonFrame(kind: 'walking' | 'idle', index: number) {
  const animation = UP_SPRITES.Gabumon;
  assert.isDefined(animation);
  const frame = animation[kind][index];
  assert.isDefined(frame);
  return readAnimationPixels(animation, frame);
}

describe('readPartnerPixels', () => {
  test('readPartnerPixels_Gabumon_WalksWithUpSprites', () => {
    expect(readPartnerPixels(createGabumon(), 0)).toEqual(readGabumonFrame('walking', 0));
  });

  test('readPartnerPixels_AfterTwoTicks_AdvancesAnimation', () => {
    expect(readPartnerPixels(createGabumon(), 2)).toEqual(readGabumonFrame('walking', 1));
  });

  test('readPartnerPixels_CallingPartner_PulsesAmber', () => {
    const pixels = readPartnerPixels(callPartner(createGabumon(), true), 0);
    expect(new Set(pixels.flat())).toEqual(new Set([null, 0xffbf47]));
  });

  test('readPartnerPixels_FailedTool_FlashesRed', () => {
    const pixels = readPartnerPixels(reactPartner(createGabumon(), 'hurt', 0), 0);
    expect(new Set(pixels.flat())).toEqual(new Set([null, 0xff5555]));
  });

  test('readPartnerPixels_CompletedTurn_HopsUp', () => {
    const pixels = readPartnerPixels(reactPartner(createGabumon(), 'happy', 0), 0);
    expect(pixels.slice(0, -1)).toEqual(readGabumonFrame('idle', 0).slice(1));
  });

  test('readPartnerPixels_HoppingPartner_KeepsEveryOpaquePixel', () => {
    const before = readGabumonFrame('idle', 0)
      .flat()
      .filter((pixel) => pixel !== null);
    const after = readPartnerPixels(reactPartner(createGabumon(), 'happy', 0), 0)
      .flat()
      .filter((pixel) => pixel !== null);
    expect(after).toEqual(before);
  });

  test.each(['angry', 'happy', 'hurt'] as const)(
    'readPartnerPixels_%sBetweenPulses_ShowsUntintedIdleFrame',
    (reaction) => {
      expect(readPartnerPixels(reactPartner(createGabumon(), reaction, 0), 5)).toEqual(
        readGabumonFrame('idle', 3)
      );
    }
  );

  test('readPartnerPixels_ExpiredReaction_ResumesWalking', () => {
    expect(readPartnerPixels(reactPartner(createGabumon(), 'hurt', 0), 30)).toEqual(
      readPartnerPixels(createGabumon(), 30)
    );
  });

  test('readPartnerPixels_AfterEightSeconds_TurnsAround', () => {
    const pixels = readPartnerPixels(createGabumon(), 80);
    expect(pixels).toEqual(readGabumonFrame('walking', 5).map((row) => row.toReversed()));
  });
});

function countWalkingFrames(form: string, isImage: boolean): number {
  const partner = createGabumon();
  const selected = {
    ...partner,
    line: { ...partner.line, forms: { ...partner.line.forms, Rookie: form } }
  };
  return new Set(
    Array.from({ length: 14 }, (_value, tick) =>
      JSON.stringify(readPartnerPixels(selected, tick, isImage))
    )
  ).size;
}

describe.each([false, true])('readPartnerPixels (image=%s)', (isImage) => {
  test.each([
    'Botamon',
    'Koromon',
    'Agumon',
    'Greymon',
    'MetalGreymon',
    'WarGreymon',
    'Punimon',
    'Tsunomon',
    'Gabumon',
    'Garurumon',
    'WereGarurumon',
    'MetalGarurumon',
    'Piyomon',
    'Birdramon',
    'Garudamon',
    'Hououmon',
    'Yuramon',
    'Tanemon',
    'Palmon',
    'Togemon',
    'Lilimon',
    'Rosemon'
  ])('readPartnerPixels_%s_RetainsDetailedWalkingSequence', (form) => {
    expect(countWalkingFrames(form, isImage)).toBeGreaterThan(2);
  });
});

describe('readStillPixels', () => {
  test('readStillPixels_ImageRenderer_RetainsMoreThanTextCellDetail', () => {
    const pixels = readStillPixels('Gabumon', true);
    expect(pixels.flat().filter((pixel) => pixel !== null).length).toBeGreaterThan(384);
  });

  test('readStillPixels_ImageRenderer_CentersLegacySpritesOnImageCanvas', () => {
    expect(readStillPixels('V-mon', true)).toHaveLength(80);
  });
  test('readStillPixels_UnmappedDotSprite_PreservesOriginalPixels', () => {
    const sheet = SHEETS['V-mon'];
    assert.isDefined(sheet);
    expect(readStillPixels('V-mon')).toEqual(placeDotPixels(readPixels(sheet, 0, false)));
  });
});
