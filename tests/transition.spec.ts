import { describe, expect, test } from 'vitest';

import { readPixels, type Sheet } from '../src/sprite.ts';
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
    const scene = createDigivolution(readSheet('Agumon'), readSheet('Greymon'), true);
    expect(findScenePixels(scene, 0)).toEqual(readPixels(readSheet('Agumon'), 0, false));
  });

  test('createDigivolution_AgumonToGreymon_EndsOnGreymon', () => {
    const scene = createDigivolution(readSheet('Agumon'), readSheet('Greymon'), true);
    expect(scene.at(-1)?.pixels).toEqual(readPixels(readSheet('Greymon'), 0, false));
  });

  test('createDigivolution_Rising_Sparkles', () => {
    const scene = createDigivolution(readSheet('Agumon'), readSheet('Greymon'), true);
    expect(listSceneColors(scene)).toContain(GOLD_SPARKLE);
  });

  test('createDigivolution_Falling_HasNoSparkles', () => {
    const scene = createDigivolution(readSheet('Greymon'), readSheet('Agumon'), false);
    expect(listSceneColors(scene)).not.toContain(GOLD_SPARKLE);
  });
});

describe('createHatching', () => {
  test('createHatching_AgumonEgg_ShowsCrackedShell', () => {
    const scene = createHatching(readSheet('Agu_Digitama'), readSheet('Botamon'));
    expect(scene.map((step) => step.pixels)).toContainEqual(
      readPixels(readSheet('Agu_Digitama'), 2, false)
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
