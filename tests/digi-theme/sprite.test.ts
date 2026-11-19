

import { LINES } from '../../plugins/digi-theme/src/roster.ts';
import {
  DEFAULT_COLOR,
  FRAMES,
  encodeImagePixels,
  encodeSvgPixels,
  packAnimations,
  packHalfBlocks,
  readAnimationPixels,
  readPixels,
  TRANSPARENT,
  type Sheet
} from '../../plugins/digi-theme/src/sprite.ts';
import { SHEETS } from '../../plugins/digi-theme/src/sprites.generated.ts';
import { UP_SPRITES } from '../../plugins/digi-theme/src/up-sprites.generated.ts';

const RED = 0xff_00_00;
const BLUE = 0x00_00_ff;

const createSheet = (firstRow: string, secondRow: string): Sheet => {
  const blankRow = '.'.repeat(16);
  return {
    palette: [RED, BLUE],
    frames: [firstRow.padEnd(16, '.') + secondRow.padEnd(16, '.') + blankRow.repeat(14)]
  };
};

const readCell = (cells: Uint32Array, column: number): number[] => [
  ...cells.subarray(column * 3, column * 3 + 3)
];

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

describe('packHalfBlocks', () => {
  it('packHalfBlocks_BothPixelsOpaque_DrawsUpperHalfOverBottom', () => {
    const cells = packHalfBlocks(readPixels(createSheet('a', 'b'), 0, false));
    expect(readCell(cells, 0)).toStrictEqual([0x25_80, RED, BLUE]);
  });

  it('packHalfBlocks_OnlyBottomOpaque_DrawsLowerHalf', () => {
    const cells = packHalfBlocks(readPixels(createSheet('.', 'b'), 0, false));
    expect(readCell(cells, 0)).toStrictEqual([0x25_84, BLUE, DEFAULT_COLOR]);
  });

  it('packHalfBlocks_BothTransparent_DrawsDefaultSpace', () => {
    const cells = packHalfBlocks(readPixels(createSheet('.', '.'), 0, false));
    expect(readCell(cells, 0)).toStrictEqual([0x20, DEFAULT_COLOR, DEFAULT_COLOR]);
  });

  it('packHalfBlocks_MirroredFrame_MovesPixelToLastColumn', () => {
    const cells = packHalfBlocks(readPixels(createSheet('a', ''), 0, true));
    expect(readCell(cells, 15)).toStrictEqual([0x25_80, RED, DEFAULT_COLOR]);
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
    'uP_SPRITES_%s_HasWalkingAndIdleFrames',
    (name) => {
      const animation = UP_SPRITES[name];
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
