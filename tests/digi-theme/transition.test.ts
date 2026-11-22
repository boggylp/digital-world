

import { readStillPixels } from '../../plugins/digi-theme/src/animation.ts';
import { placeDotPixels, readPixels, type Sheet } from '../../plugins/digi-theme/src/sprite.ts';
import { SHEETS } from '../../plugins/digi-theme/src/sprites.generated.ts';
import { createDigivolution, createHatching, findScenePixels } from '../../plugins/digi-theme/src/transition.ts';

const GOLD_SPARKLE = 0xff_e0_66;

const readSheet = (name: string): Sheet => {
  const sheet = SHEETS[name];
  if (sheet === undefined) throw new Error(`No sheet ${name}`);
  return sheet;
};

const listSceneColors = (scene: ReturnType<typeof createDigivolution>): (number | null)[] =>
  scene.flatMap((step) => step.pixels.flat());

describe('createDigivolution', () => {
  it('createDigivolution_AgumonToGreymon_OpensOnAgumon', () => {
    const scene = createDigivolution(readStillPixels('Agumon'), readStillPixels('Greymon'), true);
    expect(findScenePixels(scene, 0)).toStrictEqual(readStillPixels('Agumon'));
  });

  it('createDigivolution_AgumonToGreymon_EndsOnGreymon', () => {
    const scene = createDigivolution(readStillPixels('Agumon'), readStillPixels('Greymon'), true);
    expect(scene.at(-1)?.pixels).toStrictEqual(readStillPixels('Greymon'));
  });

  it('createDigivolution_Rising_Sparkles', () => {
    const scene = createDigivolution(readStillPixels('Agumon'), readStillPixels('Greymon'), true);
    expect(listSceneColors(scene)).toContain(GOLD_SPARKLE);
  });

  it('createDigivolution_Falling_HasNoSparkles', () => {
    const scene = createDigivolution(readStillPixels('Greymon'), readStillPixels('Agumon'), false);
    expect(listSceneColors(scene)).not.toContain(GOLD_SPARKLE);
  });

  it('createDigivolution_DotBabyToUpRookie_PreservesCanvas', () => {
    const scene = createDigivolution(readStillPixels('Pyocomon'), readStillPixels('Piyomon'), true);
    const dimensions = new Set(
      scene.flatMap(({ pixels }) => pixels.map((row) => `${pixels.length}x${row.length}`))
    );
    expect(dimensions).toStrictEqual(new Set(['80x80']));
  });
});

describe('createHatching', () => {
  it('createHatching_AgumonEgg_ShowsCrackedShell', () => {
    const egg = readSheet('Agu_Digitama');
    const scene = createHatching(egg, readStillPixels('Botamon'));
    const cracked = placeDotPixels(readPixels(egg, 2, false));
    expect(scene.map((step) => step.pixels)).toContainEqual(cracked);
  });
});

describe('findScenePixels', () => {
  it('findScenePixels_LastTick_ReturnsLastStep', () => {
    expect(findScenePixels([{ pixels: [[1]], ticks: 2 }], 1)).toStrictEqual([[1]]);
  });

  it('findScenePixels_PastTheEnd_ReturnsNull', () => {
    expect(findScenePixels([{ pixels: [[1]], ticks: 2 }], 2)).toBeNull();
  });
});
