export const FRAME_SIZE = 16;
export const SPRITE_COLUMNS = 24;
export const SPRITE_HEIGHT = 16;
export const SPRITE_ROWS = SPRITE_HEIGHT / 2;
export const IMAGE_COLUMNS = 8;
export const IMAGE_ROWS = 4;
export type Canvas = { columns: number; height: number };
export const SPRITE_CANVAS: Canvas = { columns: SPRITE_COLUMNS, height: SPRITE_HEIGHT };
export const IMAGE_CANVAS: Canvas = { columns: 80, height: 80 };

export const FRAMES = {
  walk: [0, 1],
  happy: [7],
  angry: [8],
  hurt: [9, 10],
  egg: [0, 1],
  crack: [2]
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

export type Animations = Canvas & { palette: number[]; walking: string[]; idle: string[] };

export function packAnimations(walking: Pixel[][][], idle: Pixel[][][]): Animations {
  const palette: number[] = [];
  const symbols = new Map<number, string>();
  function packFrame(frame: Pixel[][]): string {
    return frame
      .flat()
      .map((pixel) => {
        if (pixel === null) return ' ';
        const existing = symbols.get(pixel);
        if (existing !== undefined) return existing;
        if (palette.length >= 0xd800 - 33) {
          throw new Error('Animation palette exceeds single-character encoding');
        }
        const symbol = String.fromCodePoint(palette.length + 33);
        palette.push(pixel);
        symbols.set(pixel, symbol);
        return symbol;
      })
      .join('');
  }
  return {
    columns: walking[0]?.[0]?.length ?? 0,
    height: walking[0]?.length ?? 0,
    palette,
    walking: walking.map((frame) => packFrame(frame)),
    idle: idle.map((frame) => packFrame(frame))
  };
}

export function readAnimationPixels(animation: Animations, frame: string): Pixel[][] {
  return Array.from({ length: animation.height }, (_row, row) =>
    Array.from(
      { length: animation.columns },
      (_column, column) =>
        animation.palette[(frame.codePointAt(row * animation.columns + column) ?? 32) - 33] ?? null
    )
  );
}

export function placeDotPixels(pixels: Pixel[][], canvas: Canvas = SPRITE_CANVAS): Pixel[][] {
  const scale = Math.floor(Math.min(canvas.columns, canvas.height) / FRAME_SIZE);
  const left = Math.floor((canvas.columns - FRAME_SIZE * scale) / 2);
  const top = canvas.height - FRAME_SIZE * scale;
  return Array.from({ length: canvas.height }, (_row, row) =>
    Array.from(
      { length: canvas.columns },
      (_column, column) =>
        pixels[Math.floor((row - top) / scale)]?.[Math.floor((column - left) / scale)] ?? null
    )
  );
}

export function encodeImagePixels(pixels: Pixel[][]): string {
  const bytes = new Uint8Array(pixels.length * (pixels[0]?.length ?? 0) * 4);
  let offset = 0;
  for (const row of pixels) {
    for (const pixel of row) {
      if (pixel !== null) bytes.set([pixel >> 16, pixel >> 8, pixel, 255], offset);
      offset += 4;
    }
  }
  return btoa(String.fromCodePoint(...bytes));
}

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

export function encodePixels(pixels: Pixel[][]): string {
  return btoa(String.fromCodePoint(...new Uint8Array(packHalfBlocks(pixels).buffer)));
}

export function packHalfBlocks(pixels: Pixel[][]): Uint32Array {
  const columns = pixels[0]?.length ?? 0;
  const rows = Math.ceil(pixels.length / 2);
  const cells = new Uint32Array(columns * rows * 3);
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const top = pixels[row * 2]?.[column] ?? null;
      const bottom = pixels[row * 2 + 1]?.[column] ?? null;
      cells.set(packCell(top, bottom), (row * columns + column) * 3);
    }
  }
  return cells;
}
