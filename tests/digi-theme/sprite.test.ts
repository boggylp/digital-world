

import { LINES } from '../../plugins/digi-theme/src/roster.ts';
import {
  FRAMES,
  encodeImagePixels,
  encodeSvgPixels,
  packAnimations,
  readAnimationPixels,
  TRANSPARENT
} from '../../plugins/digi-theme/src/sprite.ts';
import { SHEETS } from '../../plugins/digi-theme/src/sprites.generated.ts';
import { UP_IMAGES } from '../../plugins/digi-theme/src/up-images.generated.ts';

const RED = 0xff_00_00;
const BLUE = 0x00_00_ff;

describe('animation encoding', () => {
  it('encodeImagePixels_ColorsAndTransparency_ProducesRgbaBytes', () => {
    const bytes = Buffer.from(encodeImagePixels([[0x12_34_56, null, 0]]), 'base64');
    expect([...bytes]).toStrictEqual([18, 52, 86, 255, 0, 0, 0, 0, 0, 0, 0, 255]);
  });

  it('readAnimationPixels_KnownSymbols_PreservesBlackColorAndTransparency', () => {
    const pixels = readAnimationPixels(
      { columns: 4, height: 1, palette: [0, RED, BLUE], walking: [], idle: [] },
      '! "#'
    );
    expect(pixels[0]?.slice(0, 4)).toStrictEqual([0, null, RED, BLUE]);
  });

  it('packAnimations_MultipleFrames_RoundTripsColorsAndTransparency', () => {
    const packed = packAnimations([[[0, null, RED]], [[BLUE, 0, null]]], [[[null, RED, BLUE]]]);
    const [firstFrame, secondFrame] = packed.walking;
    const [idleFrame] = packed.idle;
    assert.isDefined(firstFrame);
    assert.isDefined(secondFrame);
    assert.isDefined(idleFrame);
    const first = readAnimationPixels(packed, firstFrame);
    const second = readAnimationPixels(packed, secondFrame);
    const idle = readAnimationPixels(packed, idleFrame);
    expect([first[0]?.slice(0, 3), second[0]?.slice(0, 3), idle[0]?.slice(0, 3)]).toStrictEqual([
      [0, null, RED],
      [BLUE, 0, null],
      [null, RED, BLUE]
    ]);
  });
});

const listBlankFrames = (name: string, frames: readonly number[]): number[] => {
  const sheet = SHEETS[name];
  return frames.filter((frame) => (sheet?.frames[frame] ?? '').replaceAll(TRANSPARENT, '') === '');
};

describe('sHEETS', () => {
  it.each(LINES.map((line) => line.forms.Digitama))('sHEETS_%s_DrawsEggFrames', (name) => {
    expect(listBlankFrames(name, FRAMES.egg)).toStrictEqual([]);
  });

  it.each(LINES.flatMap(({ forms: { Digitama: _egg, ...forms } }) => Object.values(forms)))(
    'uP_IMAGES_%s_HasWalkingAndIdleFrames',
    (name) => {
      const animation = UP_IMAGES[name];
      assert.isDefined(animation);
      expect(animation.walking.length).toBeGreaterThan(0);
      expect(animation.idle.length).toBeGreaterThan(0);
    }
  );

  it('encodeSvgPixels_RunsAndGaps_MergesEachColorIntoOnePath', () => {
    const svg = encodeSvgPixels([
      [RED, RED, null, RED],
      [BLUE, null, null, null]
    ]);

    expect(svg).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 2" shape-rendering="crispEdges">' +
        '<path fill="#ff0000" d="M0 0h2v1h-2zM3 0h1v1h-1z"/><path fill="#0000ff" d="M0 1h1v1h-1z"/></svg>'
    );
  });
});
