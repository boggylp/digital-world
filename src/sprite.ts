export const FRAME_SIZE = 16;
export const SPRITE_ROWS = FRAME_SIZE / 2;

export const FRAMES = {
  walk: [0, 1],
  happy: [7],
  angry: [8],
  hurt: [9, 10],
  egg: [0, 1]
} as const;

export const REQUIRED_FRAMES = [...FRAMES.walk, ...FRAMES.happy, ...FRAMES.angry, ...FRAMES.hurt];

export const DEFAULT_COLOR = 0x01000000;
const UPPER_HALF_BLOCK = 0x2580;
const LOWER_HALF_BLOCK = 0x2584;
const SPACE = 0x20;
export const TRANSPARENT = '.';
export const PIXEL_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export type Sheet = { palette: number[]; frames: string[] };

export type Pixel = number | null;

export function readPixels(sheet: Sheet, frame: number, isMirrored: boolean): Pixel[][] {
  const pixels = sheet.frames[frame];
  if (pixels === undefined) throw new Error(`No frame ${frame}`);
  return Array.from({ length: FRAME_SIZE }, (_row, row) => {
    const line = Array.from({ length: FRAME_SIZE }, (_cell, column) => {
      const index = PIXEL_ALPHABET.indexOf(pixels.charAt(row * FRAME_SIZE + column));
      return sheet.palette[index] ?? null;
    });
    return isMirrored ? line.toReversed() : line;
  });
}

function packCell(top: Pixel, bottom: Pixel): [number, number, number] {
  if (top === null && bottom === null) return [SPACE, DEFAULT_COLOR, DEFAULT_COLOR];
  if (top === null) return [LOWER_HALF_BLOCK, bottom ?? DEFAULT_COLOR, DEFAULT_COLOR];
  return [UPPER_HALF_BLOCK, top, bottom ?? DEFAULT_COLOR];
}

export function encodeFrame(sheet: Sheet, frame: number, isMirrored: boolean): string {
  const cells = packHalfBlocks(readPixels(sheet, frame, isMirrored));
  return btoa(String.fromCodePoint(...new Uint8Array(cells.buffer)));
}

export function packHalfBlocks(pixels: Pixel[][]): Uint32Array {
  const cells = new Uint32Array(FRAME_SIZE * SPRITE_ROWS * 3);
  for (let row = 0; row < SPRITE_ROWS; row++) {
    for (let column = 0; column < FRAME_SIZE; column++) {
      const top = pixels[row * 2]?.[column] ?? null;
      const bottom = pixels[row * 2 + 1]?.[column] ?? null;
      cells.set(packCell(top, bottom), (row * FRAME_SIZE + column) * 3);
    }
  }
  return cells;
}
