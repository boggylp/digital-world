export const FRAME_SIZE = 16;
const PIXEL_ROWS_PER_CELL = 2;
export const SPRITE_COLUMNS = 24;
export const SPRITE_HEIGHT = 16;
export const SPRITE_ROWS = SPRITE_HEIGHT / PIXEL_ROWS_PER_CELL;
export const IMAGE_COLUMNS = 4;
export const IMAGE_ROWS = 2;
export type Canvas = { columns: number; height: number };
export const SPRITE_CANVAS: Canvas = { columns: SPRITE_COLUMNS, height: SPRITE_HEIGHT };
export const IMAGE_CANVAS: Canvas = { columns: 80, height: 80 };

const CRACK_FRAME = 2;
const HAPPY_FRAME = 7;
const ANGRY_FRAME = 8;
const HURT_FRAME = 9;
const HURT_RECOIL_FRAME = 10;

export const FRAMES = {
  walk: [0, 1],
  happy: [HAPPY_FRAME],
  angry: [ANGRY_FRAME],
  hurt: [HURT_FRAME, HURT_RECOIL_FRAME],
  egg: [0, 1],
  crack: [CRACK_FRAME]
} as const;

export const REQUIRED_FRAMES = [...FRAMES.walk, ...FRAMES.happy, ...FRAMES.angry, ...FRAMES.hurt];

export const DEFAULT_COLOR = 0x01_00_00_00;
const UPPER_HALF_BLOCK = 0x25_80;
const LOWER_HALF_BLOCK = 0x25_84;
const SPACE = 0x20;
const FIRST_SYMBOL = 0x21;
const FIRST_SURROGATE = 0xd8_00;
const CELL_FIELDS = 3;
export const RGBA_CHANNELS = 4;
const RED_SHIFT = 16;
const GREEN_SHIFT = 8;
const OPAQUE_ALPHA = 255;
const HEX_RADIX = 16;
const HEX_DIGITS = 6;
export const CENTERING_DIVISOR = 2;
export const TRANSPARENT = '.';
export const PIXEL_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export type Sheet = { palette: number[]; frames: string[] };

export type Pixel = number | null;

export type Animations = Canvas & { palette: number[]; walking: string[]; idle: string[] };

export const packAnimations = (walking: Pixel[][][], idle: Pixel[][][]): Animations => {
  const palette: number[] = [];
  const symbols = new Map<number, string>();
  const packFrame = (frame: Pixel[][]): string =>
    frame
      .flat()
      .map((pixel) => {
        if (pixel === null) return ' ';
        const existing = symbols.get(pixel);
        if (existing !== undefined) return existing;
        if (palette.length >= FIRST_SURROGATE - FIRST_SYMBOL) {
          throw new Error('Animation palette exceeds single-character encoding');
        }
        const symbol = String.fromCodePoint(palette.length + FIRST_SYMBOL);
        palette.push(pixel);
        symbols.set(pixel, symbol);
        return symbol;
      })
      .join('');
  return {
    columns: walking[0]?.[0]?.length ?? 0,
    height: walking[0]?.length ?? 0,
    palette,
    walking: walking.map((frame) => packFrame(frame)),
    idle: idle.map((frame) => packFrame(frame))
  };
};

export const readAnimationPixels = (animation: Animations, frame: string): Pixel[][] =>
  Array.from({ length: animation.height }, (_row, row) =>
    Array.from(
      { length: animation.columns },
      (_column, column) =>
        animation.palette[
          (frame.codePointAt(row * animation.columns + column) ?? SPACE) - FIRST_SYMBOL
        ] ?? null
    )
  );

export const placeDotPixels = (pixels: Pixel[][], canvas: Canvas = SPRITE_CANVAS): Pixel[][] => {
  const scale = Math.floor(Math.min(canvas.columns, canvas.height) / FRAME_SIZE);
  const left = Math.floor((canvas.columns - FRAME_SIZE * scale) / CENTERING_DIVISOR);
  const top = canvas.height - FRAME_SIZE * scale;
  return Array.from({ length: canvas.height }, (_row, row) =>
    Array.from(
      { length: canvas.columns },
      (_column, column) =>
        pixels[Math.floor((row - top) / scale)]?.[Math.floor((column - left) / scale)] ?? null
    )
  );
};

export const encodeImagePixels = (pixels: Pixel[][]): string => {
  const bytes = new Uint8Array(pixels.length * (pixels[0]?.length ?? 0) * RGBA_CHANNELS);
  let offset = 0;
  for (const row of pixels) {
    for (const pixel of row) {
      if (pixel !== null) {
        bytes.set([pixel >> RED_SHIFT, pixel >> GREEN_SHIFT, pixel, OPAQUE_ALPHA], offset);
      }
      offset += RGBA_CHANNELS;
    }
  }
  return btoa(String.fromCodePoint(...bytes));
};

export const readPixels = (sheet: Sheet, frame: number, isMirrored: boolean): Pixel[][] => {
  const pixels = sheet.frames[frame];
  if (pixels === undefined) throw new Error(`No frame ${frame}`);
  return Array.from({ length: FRAME_SIZE }, (_row, row) => {
    const line = Array.from({ length: FRAME_SIZE }, (_cell, column) => {
      const index = PIXEL_ALPHABET.indexOf(pixels.charAt(row * FRAME_SIZE + column));
      return sheet.palette[index] ?? null;
    });
    return isMirrored ? line.toReversed() : line;
  });
};

const packCell = (top: Pixel, bottom: Pixel): [number, number, number] => {
  if (top === null && bottom === null) return [SPACE, DEFAULT_COLOR, DEFAULT_COLOR];
  if (top === null) return [LOWER_HALF_BLOCK, bottom ?? DEFAULT_COLOR, DEFAULT_COLOR];
  return [UPPER_HALF_BLOCK, top, bottom ?? DEFAULT_COLOR];
};

export const packHalfBlocks = (pixels: Pixel[][]): Uint32Array => {
  const columns = pixels[0]?.length ?? 0;
  const rows = Math.ceil(pixels.length / PIXEL_ROWS_PER_CELL);
  const cells = new Uint32Array(columns * rows * CELL_FIELDS);
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const top = pixels[row * PIXEL_ROWS_PER_CELL]?.[column] ?? null;
      const bottom = pixels[row * PIXEL_ROWS_PER_CELL + 1]?.[column] ?? null;
      cells.set(packCell(top, bottom), (row * columns + column) * CELL_FIELDS);
    }
  }
  return cells;
};

export const encodePixels = (pixels: Pixel[][]): string => {
  const bytes = new Uint8Array(packHalfBlocks(pixels).buffer);
  return btoa(String.fromCodePoint(...bytes));
};

const formatHexColor = (pixel: number): string => `#${pixel.toString(HEX_RADIX).padStart(HEX_DIGITS, '0')}`;

const readRunLength = (row: readonly Pixel[], left: number): number => {
  let end = left + 1;
  while (end < row.length && row[end] === row[left]) end += 1;
  return end - left;
};

const traceRuns = (pixels: Pixel[][]): Map<number, string[]> => {
  const runs = new Map<number, string[]>();
  pixels.forEach((row, top) => {
    row.forEach((pixel, left) => {
      if (pixel === null || row[left - 1] === pixel) return;
      const length = readRunLength(row, left);
      const colorRuns = runs.get(pixel) ?? [];
      colorRuns.push(`M${left} ${top}h${length}v1h-${length}z`);
      runs.set(pixel, colorRuns);
    });
  });
  return runs;
};

export const encodeSvgPixels = (pixels: Pixel[][]): string => {
  const paths = [...traceRuns(pixels)].map(
    ([pixel, runs]) => `<path fill="${formatHexColor(pixel)}" d="${runs.join('')}"/>`
  );
  const columns = pixels[0]?.length ?? 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${columns} ${pixels.length}" shape-rendering="crispEdges">${paths.join('')}</svg>`;
};

export const createImageSource = (rgba: string): { rgba: string; width: number; height: number } => ({
  rgba,
  width: IMAGE_CANVAS.columns,
  height: IMAGE_CANVAS.height
});
