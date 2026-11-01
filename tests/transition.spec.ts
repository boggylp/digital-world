import { describe, expect, test } from 'vitest';

import { readStillPixels } from '../src/animation.ts';
import { placeDotPixels, readPixels, type Sheet } from '../src/sprite.ts';
import { SHEETS } from '../src/sprites.generated.ts';
import { createDigivolution, createHatching, findScenePixels } from '../src/transition.ts';

const GOLD_SPARKLE = 0xffe066;

function readSheet(name: string): Sheet {
  const sheet = SHEETS[name];
  if (sheet === undefined) throw new Error(`No sheet ${name}`);
  return sheet;
}

function listSceneColors(scene: ReturnType<typeof createDigivolution>): (number | null)[] {
  return scene.flatMap((step) => step.pixels.flat());
}

describe('createDigivolution', () => {
  test('createDigivolution_AgumonToGreymon_OpensOnAgumon', () => {
    const scene = createDigivolution(readStillPixels('Agumon'), readStillPixels('Greymon'), true);
    expect(findScenePixels(scene, 0)).toEqual(readStillPixels('Agumon'));
  });

  test('createDigivolution_AgumonToGreymon_EndsOnGreymon', () => {
    const scene = createDigivolution(readStillPixels('Agumon'), readStillPixels('Greymon'), true);
    expect(scene.at(-1)?.pixels).toEqual(readStillPixels('Greymon'));
  });

  test('createDigivolution_Rising_Sparkles', () => {
    const scene = createDigivolution(readStillPixels('Agumon'), readStillPixels('Greymon'), true);
    expect(listSceneColors(scene)).toContain(GOLD_SPARKLE);
  });

  test('createDigivolution_Falling_HasNoSparkles', () => {
    const scene = createDigivolution(readStillPixels('Greymon'), readStillPixels('Agumon'), false);
    expect(listSceneColors(scene)).not.toContain(GOLD_SPARKLE);
  });

  test('createDigivolution_DotBabyToUpRookie_PreservesCanvas', () => {
    const scene = createDigivolution(readStillPixels('Pyocomon'), readStillPixels('Piyomon'), true);
    const dimensions = new Set(
      scene.flatMap(({ pixels }) => pixels.map((row) => `${pixels.length}x${row.length}`))
    );
    expect(dimensions).toEqual(new Set(['16x24']));
  });
});

describe('createHatching', () => {
  test('createHatching_AgumonEgg_ShowsCrackedShell', () => {
    const scene = createHatching(readSheet('Agu_Digitama'), readStillPixels('Botamon'));
    expect(scene.map((step) => step.pixels)).toContainEqual(
      placeDotPixels(readPixels(readSheet('Agu_Digitama'), 2, false))
    );
  });
});

describe('findScenePixels', () => {
  test('findScenePixels_LastTick_ReturnsLastStep', () => {
    expect(findScenePixels([{ pixels: [[1]], ticks: 2 }], 1)).toEqual([[1]]);
  });

  test('findScenePixels_PastTheEnd_ReturnsNull', () => {
    expect(findScenePixels([{ pixels: [[1]], ticks: 2 }], 2)).toBeNull();
  });
});
