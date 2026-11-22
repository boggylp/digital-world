

import { readPartnerPixels, readStillPixels } from '../../plugins/digi-theme/src/animation.ts';
import { callPartner, createPartner, reactPartner, type Reaction } from '../../plugins/digi-theme/src/partner.ts';
import { findLine } from '../../plugins/digi-theme/src/roster.ts';
import { placeDotPixels, readAnimationPixels, readPixels } from '../../plugins/digi-theme/src/sprite.ts';
import { SHEETS } from '../../plugins/digi-theme/src/sprites.generated.ts';
import { UP_IMAGES } from '../../plugins/digi-theme/src/up-images.generated.ts';

const createGabumon = () => {
  const line = findLine('Gabumon');
  if (line === null) throw new Error('Gabumon line missing');
  return { ...createPartner(line), stage: 'Rookie' as const };
};

const readGabumonFrame = (kind: 'walking' | 'idle', index: number) => {
  const animation = UP_IMAGES.Gabumon;
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
    expect(pixels.slice(0, -5)).toStrictEqual(readGabumonFrame('idle', 0).slice(5));
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

const countWalkingFrames = (form: string): number => {
  const partner = createGabumon();
  const selected = {
    ...partner,
    line: { ...partner.line, forms: { ...partner.line.forms, Rookie: form } }
  };
  return new Set(
    Array.from({ length: 14 }, (_value, tick) =>
      JSON.stringify(readPartnerPixels(selected, tick))
    )
  ).size;
};

describe('readPartnerPixels walking', () => {
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
    expect(countWalkingFrames(form)).toBeGreaterThan(2);
  });
});

describe('readPartnerPixels egg', () => {
  it('readPartnerPixels_EggOverTwoBeats_WobblesBetweenEggFrames', () => {
    const egg = { ...createGabumon(), stage: 'Digitama' as const };
    const sheet = SHEETS['Gabu_Digitama'];
    assert.isDefined(sheet);

    expect([readPartnerPixels(egg, 0), readPartnerPixels(egg, 5)]).toStrictEqual([
      placeDotPixels(readPixels(sheet, 0, false)),
      placeDotPixels(readPixels(sheet, 1, false))
    ]);
  });
});

describe('readStillPixels', () => {
  it('readStillPixels_Gabumon_RetainsDetailedArtwork', () => {
    const pixels = readStillPixels('Gabumon');
    expect(pixels.flat().filter((pixel) => pixel !== null).length).toBeGreaterThan(384);
  });

  it('readStillPixels_Veemon_FillsImageCanvasHeight', () => {
    expect(readStillPixels('V-mon')).toHaveLength(80);
  });

  it('readStillPixels_Egg_PreservesOriginalDotPixels', () => {
    const sheet = SHEETS['V_Digitama'];
    assert.isDefined(sheet);
    expect(readStillPixels('V_Digitama')).toStrictEqual(placeDotPixels(readPixels(sheet, 0, false)));
  });
});
