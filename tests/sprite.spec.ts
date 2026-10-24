import { describe, expect, test } from 'vitest';

import { LINES } from '../src/roster.ts';
import {
  DEFAULT_COLOR,
  FRAMES,
  packHalfBlocks,
  readPixels,
  REQUIRED_FRAMES,
  TRANSPARENT,
  type Sheet
} from '../src/sprite.ts';
import { SHEETS } from '../src/sprites.generated.ts';

const RED = 0xff0000;
const BLUE = 0x0000ff;

function createSheet(firstRow: string, secondRow: string): Sheet {
  const blankRow = '.'.repeat(16);
  return {
    palette: [RED, BLUE],
    frames: [firstRow.padEnd(16, '.') + secondRow.padEnd(16, '.') + blankRow.repeat(14)]
  };
}

function readCell(cells: Uint32Array, column: number): number[] {
  return [...cells.subarray(column * 3, column * 3 + 3)];
}

describe('packHalfBlocks', () => {
  test('packHalfBlocks_BothPixelsOpaque_DrawsUpperHalfOverBottom', () => {
    const cells = packHalfBlocks(readPixels(createSheet('a', 'b'), 0, false));
    expect(readCell(cells, 0)).toEqual([0x2580, RED, BLUE]);
  });

  test('packHalfBlocks_OnlyBottomOpaque_DrawsLowerHalf', () => {
    const cells = packHalfBlocks(readPixels(createSheet('.', 'b'), 0, false));
    expect(readCell(cells, 0)).toEqual([0x2584, BLUE, DEFAULT_COLOR]);
  });

  test('packHalfBlocks_BothTransparent_DrawsDefaultSpace', () => {
    const cells = packHalfBlocks(readPixels(createSheet('.', '.'), 0, false));
    expect(readCell(cells, 0)).toEqual([0x20, DEFAULT_COLOR, DEFAULT_COLOR]);
  });

  test('packHalfBlocks_MirroredFrame_MovesPixelToLastColumn', () => {
    const cells = packHalfBlocks(readPixels(createSheet('a', ''), 0, true));
    expect(readCell(cells, 15)).toEqual([0x2580, RED, DEFAULT_COLOR]);
  });
});

function listBlankFrames(name: string, frames: readonly number[]): number[] {
  const sheet = SHEETS[name];
  return frames.filter((frame) => (sheet?.frames[frame] ?? '').replaceAll(TRANSPARENT, '') === '');
}

describe('SHEETS', () => {
  test.each(LINES.map((line) => line.forms.Digitama))('SHEETS_%s_DrawsEggFrames', (name) => {
    expect(listBlankFrames(name, FRAMES.egg)).toEqual([]);
  });

  test.each(LINES.flatMap(({ forms: { Digitama: _egg, ...forms } }) => Object.values(forms)))(
    'SHEETS_%s_DrawsRequiredFrames',
    (name) => {
      expect(listBlankFrames(name, REQUIRED_FRAMES)).toEqual([]);
    }
  );
});
