

import { readPartnerPixels, readStillPixels } from '../../plugins/agent-digitama/src/animation.ts';
import { callPartner, createPartner, reactPartner, type Reaction } from '../../plugins/agent-digitama/src/partner.ts';
import { findLine } from '../../plugins/agent-digitama/src/roster.ts';
import { placeDotPixels, readAnimationPixels, readPixels } from '../../plugins/agent-digitama/src/sprite.ts';
import { SHEETS } from '../../plugins/agent-digitama/src/sprites.generated.ts';
import { UP_SPRITES } from '../../plugins/agent-digitama/src/up-sprites.generated.ts';

const createGabumon = () => {
  const line = findLine('Gabumon');
  if (line === null) throw new Error('Gabumon line missing');
  return { ...createPartner(line), stage: 'Rookie' as const };
};

const readGabumonFrame = (kind: 'walking' | 'idle', index: number) => {
  const animation = UP_SPRITES.Gabumon;
  assert.isDefined(animation);
  const frame = animation[kind][index];
  assert.isDefined(frame);
  return readAnimationPixels(animation, frame);
};

const createReactingGabumon = (reaction: Reaction) => reactPartner(createGabumon(), reaction, 0);

const listOpaquePixels = (pixels: (number | null)[][]) =>
  pixels.flat().filter((pixel) => pixel !== null);

describe('readPartnerPixels', () => {
  it('readPartnerPixels_Gabumon_WalksWithUpSprites', () => {
    expect(readPartnerPixels(createGabumon(), 0)).toStrictEqual(readGabumonFrame('walking', 0));
  });

  it('readPartnerPixels_AfterTwoTicks_AdvancesAnimation', () => {
    expect(readPartnerPixels(createGabumon(), 2)).toStrictEqual(readGabumonFrame('walking', 1));
  });

  it('readPartnerPixels_CallingPartner_PulsesAmber', () => {
    const pixels = readPartnerPixels(callPartner(createGabumon(), true), 0);
    expect(new Set(pixels.flat())).toStrictEqual(new Set([null, 0xff_bf_47]));
  });

  it('readPartnerPixels_FailedTool_FlashesRed', () => {
    const pixels = readPartnerPixels(createReactingGabumon('hurt'), 0);
    expect(new Set(pixels.flat())).toStrictEqual(new Set([null, 0xff_55_55]));
  });

  it('readPartnerPixels_CompletedTurn_HopsUp', () => {
    const pixels = readPartnerPixels(createReactingGabumon('happy'), 0);
    expect(pixels.slice(0, -1)).toStrictEqual(readGabumonFrame('idle', 0).slice(1));
  });

  it('readPartnerPixels_HoppingPartner_KeepsEveryOpaquePixel', () => {
    const after = readPartnerPixels(createReactingGabumon('happy'), 0);
    expect(listOpaquePixels(after)).toStrictEqual(listOpaquePixels(readGabumonFrame('idle', 0)));
  });

  it.each(['angry', 'happy', 'hurt'] as const)(
    'readPartnerPixels_%sBetweenPulses_ShowsUntintedIdleFrame',
    (reaction) => {
      const pixels = readPartnerPixels(createReactingGabumon(reaction), 5);
      expect(pixels).toStrictEqual(readGabumonFrame('idle', 3));
    }
  );

  it('readPartnerPixels_ExpiredReaction_ResumesWalking', () => {
    const pixels = readPartnerPixels(createReactingGabumon('hurt'), 30);
    expect(pixels).toStrictEqual(readPartnerPixels(createGabumon(), 30));
  });

  it('readPartnerPixels_AfterEightSeconds_TurnsAround', () => {
    const pixels = readPartnerPixels(createGabumon(), 80);
    expect(pixels).toStrictEqual(readGabumonFrame('walking', 5).map((row) => row.toReversed()));
  });
});

const countWalkingFrames = (form: string, isImage: boolean): number => {
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
};

describe.each([false, true])('readPartnerPixels (image=%s)', (isImage) => {
  it.each([
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
  it('readStillPixels_ImageRenderer_RetainsMoreThanTextCellDetail', () => {
    const pixels = readStillPixels('Gabumon', true);
    expect(pixels.flat().filter((pixel) => pixel !== null).length).toBeGreaterThan(384);
  });

  it('readStillPixels_ImageRenderer_CentersLegacySpritesOnImageCanvas', () => {
    expect(readStillPixels('V-mon', true)).toHaveLength(80);
  });

  it('readStillPixels_Egg_PreservesOriginalDotPixels', () => {
    const sheet = SHEETS['V_Digitama'];
    assert.isDefined(sheet);
    expect(readStillPixels('V_Digitama')).toStrictEqual(placeDotPixels(readPixels(sheet, 0, false)));
  });
});
