import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import pngjs from 'pngjs';

import { LINES } from '../src/roster.ts';
import {
  FRAME_SIZE,
  FRAMES,
  PIXEL_ALPHABET,
  TRANSPARENT,
  type Sheet
} from '../src/sprite.ts';
import { readOpaqueColor } from './pixels.ts';

type Png = ReturnType<typeof pngjs.PNG.sync.read>;

const readSymbol = (png: Png, palette: number[], pixelIndex: number): string => {
  const color = readOpaqueColor(png.data, pixelIndex);
  if (color === null) return TRANSPARENT;
  let index = palette.indexOf(color);
  if (index === -1) index = palette.push(color) - 1;
  return `${PIXEL_ALPHABET[index]}`;
};

const readFrame = (png: Png, palette: number[], left: number, top: number): string => {
  let pixels = '';
  for (let row = top; row < top + FRAME_SIZE; row++) {
    for (let column = left; column < left + FRAME_SIZE; column++) {
      pixels += readSymbol(png, palette, row * png.width + column);
    }
  }
  return pixels;
};

const readSheet = async (path: string): Promise<Sheet> => {
  const png = pngjs.PNG.sync.read(await readFile(path));
  const columns = png.width / FRAME_SIZE;
  const frameCount = columns * (png.height / FRAME_SIZE);
  const palette: number[] = [];
  const frames: string[] = [];
  for (let frame = 0; frame < frameCount; frame++) {
    const left = (frame % columns) * FRAME_SIZE;
    const top = Math.floor(frame / columns) * FRAME_SIZE;
    frames.push(readFrame(png, palette, left, top));
  }
  if (palette.length > PIXEL_ALPHABET.length) {
    throw new Error(`${path}: ${palette.length} colors`);
  }
  return { palette, frames };
};

const assertFramesDrawn = (name: string, sheet: Sheet, required: readonly number[]): void => {
  const blank = required.filter(
    (frame) => (sheet.frames[frame] ?? '').replaceAll(TRANSPARENT, '') === ''
  );
  if (blank.length > 0) throw new Error(`${name}: blank frames ${blank.join(', ')}`);
};

const spriteDirectory = process.argv[2] ?? 'sprites';
const sheets: Record<string, Sheet> = {};
for (const name of LINES.map((line) => line.forms.Digitama)) {
  const sheet = await readSheet(join(spriteDirectory, `${name}.png`));
  assertFramesDrawn(name, sheet, [...FRAMES.egg, ...FRAMES.crack]);
  sheets[name] = sheet;
}

const data = JSON.stringify(sheets);
await writeFile(
  'src/sprites.generated.ts',
  `import type { Sheet } from './sprite.ts';

export const SHEETS: Record<string, Sheet> = JSON.parse('${data}');
`
);
console.log(`Wrote ${Object.keys(sheets).length} sheets`);
