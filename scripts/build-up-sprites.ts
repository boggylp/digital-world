import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { parse } from 'csv-parse/sync';
import sharp from 'sharp';

import { LINES } from '../src/roster.ts';
import {
  FRAME_SIZE,
  IMAGE_CANVAS,
  packAnimations,
  SPRITE_CANVAS,
  type Canvas,
  type Animations,
  type Pixel
} from '../src/sprite.ts';

const aliases: Record<string, string> = {
  Piyomon: 'biyomon',
  Hououmon: 'phoenixmon',
  Lilimon: 'lillymon'
};
const directory = process.argv[2] ?? 'assets/digimon-up';
const output = process.argv[3] ?? 'src/up-sprites.generated.ts';
const records: Record<string, string>[] = parse(readFileSync(join(directory, 'sequences.csv')), {
  columns: true,
  skip_empty_lines: true
});

function resolveFramePath(name: string, token: string): string {
  const parts = token.split(':');
  const folder = parts.length === 2 && parts[0] !== '1' ? `${name}_${parts[0]}` : name;
  return join(directory, 'sprites', folder, `${folder}_${parts.at(-1)}.png`);
}

function readAnimationFrames(paths: string[], scale: number, canvas: Canvas): Promise<Pixel[][][]> {
  return Promise.all(
    paths.map(async (path) => {
      const image = sharp(path);
      const { width, height } = await image.metadata();
      if (!width || !height) throw new Error(`${path}: missing dimensions`);
      const resizedWidth = Math.max(1, Math.round(width * scale));
      const resizedHeight = Math.max(1, Math.round(height * scale));
      const left = Math.floor((canvas.columns - resizedWidth) / 2);
      const pixels = await image
        .resize(resizedWidth, resizedHeight, { kernel: 'nearest', fit: 'fill' })
        .extend({
          top: canvas.height - resizedHeight,
          bottom: 0,
          left,
          right: canvas.columns - resizedWidth - left,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .ensureAlpha()
        .raw()
        .toBuffer();
      const frame = Array.from({ length: canvas.height }, (_row, row) =>
        Array.from({ length: canvas.columns }, (_column, column) => {
          const offset = (row * canvas.columns + column) * 4;
          return pixels.readUInt8(offset + 3) < 128 ? null : pixels.readUIntBE(offset, 3);
        })
      );
      if (frame.every((row) => row.every((pixel) => pixel === null))) {
        throw new Error(`${path}: empty frame`);
      }
      return frame;
    })
  );
}

async function buildAnimation(
  walking: string[],
  idle: string[],
  canvas: Canvas
): Promise<Animations> {
  const dimensions = await Promise.all([...walking, ...idle].map((path) => sharp(path).metadata()));
  const scale = Math.min(
    1,
    canvas.columns / Math.max(...dimensions.map(({ width }) => width ?? 0)),
    (canvas.height - canvas.height / FRAME_SIZE) /
      Math.max(...dimensions.map(({ height }) => height ?? 0))
  );
  return packAnimations(
    await readAnimationFrames(walking, scale, canvas),
    await readAnimationFrames(idle, scale, canvas)
  );
}

const sprites: Record<string, Animations> = {};
const imageImports: string[] = [];
const imageEntries: string[] = [];
const imageDirectory = join(dirname(output), 'up-images');
mkdirSync(imageDirectory, { recursive: true });
for (const name of new Set(LINES.flatMap((line) => Object.values(line.forms)))) {
  const upstream = aliases[name] ?? name.toLowerCase();
  const record = records.find((row) => row['digimon name'] === upstream);
  if (!record) continue;
  if (!record.walking?.trim() || !record.idle?.trim()) {
    throw new Error(`${upstream}: missing walking or idle sequence`);
  }
  const walking = record.walking
    .trim()
    .split(/\s+/u)
    .map((token) => resolveFramePath(upstream, token));
  const idle = record.idle
    .trim()
    .split(/\s+/u)
    .map((token) => resolveFramePath(upstream, token));
  sprites[name] = await buildAnimation(walking, idle, SPRITE_CANVAS);
  const image = await buildAnimation(walking, idle, IMAGE_CANVAS);
  const identifier = `image${imageImports.length}`;
  imageImports.push(
    `import { animation as ${identifier} } from './up-images/${upstream}.generated.ts';`
  );
  imageEntries.push(`${JSON.stringify(name)}: ${identifier}`);
  writeFileSync(
    join(imageDirectory, `${upstream}.generated.ts`),
    `import type { Animations } from '../sprite.ts';\n\nexport const animation: Animations = JSON.parse(${JSON.stringify(JSON.stringify(image))});\n`
  );
}

writeFileSync(
  output,
  `import type { Animations } from './sprite.ts';\n\nexport const UP_SPRITES: Record<string, Animations> = JSON.parse(${JSON.stringify(JSON.stringify(sprites))});\n`
);
writeFileSync(
  join(dirname(output), 'up-images.generated.ts'),
  `import type { Animations } from './sprite.ts';\n${imageImports.join('\n')}\n\nexport const UP_IMAGES: Record<string, Animations> = {${imageEntries.join(',')}};\n`
);
console.log(`Built Digimon UP animations for ${Object.keys(sprites).join(', ')}`);
