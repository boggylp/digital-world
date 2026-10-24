import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import pngjs from 'pngjs';

import { LINES } from '../src/roster.ts';
import {
  FRAME_SIZE,
  FRAMES,
  PIXEL_ALPHABET,
  REQUIRED_FRAMES,
  TRANSPARENT,
  type Sheet
} from '../src/sprite.ts';

function readSheet(path: string): Sheet {
  const png = pngjs.PNG.sync.read(readFileSync(path));
  const columns = png.width / FRAME_SIZE;
  const frameCount = columns * (png.height / FRAME_SIZE);
  const palette: number[] = [];
  const frames: string[] = [];
  for (let frame = 0; frame < frameCount; frame++) {
    const left = (frame % columns) * FRAME_SIZE;
    const top = Math.floor(frame / columns) * FRAME_SIZE;
    let pixels = '';
    for (let row = top; row < top + FRAME_SIZE; row++) {
      for (let column = left; column < left + FRAME_SIZE; column++) {
        const offset = (row * png.width + column) * 4;
        if (png.data.readUInt8(offset + 3) < 128) {
          pixels += TRANSPARENT;
          continue;
        }
        const color = png.data.readUIntBE(offset, 3);
        let index = palette.indexOf(color);
        if (index === -1) index = palette.push(color) - 1;
        pixels += PIXEL_ALPHABET[index];
      }
    }
    frames.push(pixels);
  }
  if (palette.length > PIXEL_ALPHABET.length) {
    throw new Error(`${path}: ${palette.length} colors`);
  }
  return { palette, frames };
}

function assertFramesDrawn(name: string, sheet: Sheet, required: readonly number[]) {
  const blank = required.filter(
    (frame) => (sheet.frames[frame] ?? '').replaceAll(TRANSPARENT, '') === ''
  );
  if (blank.length > 0) throw new Error(`${name}: blank frames ${blank.join(', ')}`);
}

const spriteDirectory = process.argv[2] ?? 'sprites';
const sheets: Record<string, Sheet> = {};
for (const line of LINES) {
  for (const [stage, name] of Object.entries(line.forms)) {
    const sheet = readSheet(join(spriteDirectory, `${name}.png`));
    assertFramesDrawn(name, sheet, stage === 'Digitama' ? FRAMES.egg : REQUIRED_FRAMES);
    sheets[name] = sheet;
  }
}

const data = JSON.stringify(sheets);
writeFileSync(
  'src/sprites.generated.ts',
  `import type { Sheet } from './sprite.ts';

export const SHEETS: Record<string, Sheet> = JSON.parse('${data}');
`
);
console.log(`Wrote ${Object.keys(sheets).length} sheets`);
