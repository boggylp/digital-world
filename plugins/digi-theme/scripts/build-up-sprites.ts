import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { parse } from 'csv-parse/sync';
import sharp from 'sharp';

import { LINES } from '../src/roster.ts';
import {
  FRAME_SIZE,
  IMAGE_CANVAS,
  packAnimations,
  CENTERING_DIVISOR,
  type Animations,
  type Pixel
} from '../src/sprite.ts';
import { readOpaqueColor } from './pixels.ts';

const VARIANT_TOKEN_PARTS = 2;

const aliases: Record<string, string> = {
  Piyomon: 'biyomon',
  Hououmon: 'phoenixmon',
  Lilimon: 'lillymon',
  Pyocomon: 'yokomon',
  Plotmon: 'salamon',
  Tailmon: 'gatomon',
  Chicomon: 'chibomon',
  Chibimon: 'demiveemon',
  'V-mon': 'veemon',
  'XV-mon': 'exveemon',
  Imperialdramon_Fighter: 'imperialdramon_fightermode'
};
const directory = process.argv[2] ?? 'assets/digimon-up';
const output = process.argv[3] ?? 'src/up-images.generated.ts';
const records: Record<string, string>[] = parse(
  await readFile(join(directory, 'sequences.csv')),
  {
    columns: true,
    skip_empty_lines: true
  }
);

const resolveFramePath = (name: string, token: string): string => {
  const parts = token.split(':');
  const folder =
    parts.length === VARIANT_TOKEN_PARTS && parts[0] !== '1' ? `${name}_${parts[0]}` : name;
  return join(directory, 'sprites', folder, `${folder}_${parts.at(-1)}.png`);
};

const readAnimationFrames = (paths: string[], scale: number): Promise<Pixel[][][]> =>
  Promise.all(
    paths.map(async (path) => {
      const image = sharp(path);
      const { width, height } = await image.metadata();
      if (!width || !height) throw new Error(`${path}: missing dimensions`);
      const resizedWidth = Math.max(1, Math.round(width * scale));
      const resizedHeight = Math.max(1, Math.round(height * scale));
      const left = Math.floor((IMAGE_CANVAS.columns - resizedWidth) / CENTERING_DIVISOR);
      const pixels = await image
        .resize(resizedWidth, resizedHeight, { kernel: 'nearest', fit: 'fill' })
        .extend({
          top: IMAGE_CANVAS.height - resizedHeight,
          bottom: 0,
          left,
          right: IMAGE_CANVAS.columns - resizedWidth - left,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .ensureAlpha()
        .raw()
        .toBuffer();
      const frame = Array.from({ length: IMAGE_CANVAS.height }, (_row, row) =>
        Array.from({ length: IMAGE_CANVAS.columns }, (_column, column) =>
          readOpaqueColor(pixels, row * IMAGE_CANVAS.columns + column)
        )
      );
      if (frame.every((row) => row.every((pixel) => pixel === null))) {
        throw new Error(`${path}: empty frame`);
      }
      return frame;
    })
  );

const buildAnimation = async (walking: string[], idle: string[]): Promise<Animations> => {
  const dimensions = await Promise.all([...walking, ...idle].map((path) => sharp(path).metadata()));
  const scale = Math.min(
    IMAGE_CANVAS.columns / Math.max(...dimensions.map(({ width }) => width ?? 0)),
    (IMAGE_CANVAS.height - IMAGE_CANVAS.height / FRAME_SIZE) /
      Math.max(...dimensions.map(({ height }) => height ?? 0))
  );
  return packAnimations(
    await readAnimationFrames(walking, scale),
    await readAnimationFrames(idle, scale)
  );
};

const resolveSequence = (upstream: string, sequence: string): string[] =>
  sequence
    .trim()
    .split(/\s+/u)
    .map((token) => resolveFramePath(upstream, token));

const forms: string[] = [];
const imageImports: string[] = [];
const imageEntries: string[] = [];
const imageDirectory = join(dirname(output), 'up-images');

const buildForm = async (
  name: string,
  upstream: string,
  record: Record<string, string>
): Promise<void> => {
  if (!record.idle?.trim()) throw new Error(`${upstream}: missing idle sequence`);
  const idle = resolveSequence(upstream, record.idle);
  const walking = record.walking?.trim() ? resolveSequence(upstream, record.walking) : idle;
  const image = await buildAnimation(walking, idle);
  const identifier = `image${imageImports.length}`;
  forms.push(name);
  imageImports.push(
    `import { animation as ${identifier} } from './up-images/${upstream}.generated.ts';`
  );
  imageEntries.push(`${JSON.stringify(name)}: ${identifier}`);
  await writeFile(
    join(imageDirectory, `${upstream}.generated.ts`),
    `import type { Animations } from '../sprite.ts';\n\nexport const animation: Animations = JSON.parse(${JSON.stringify(JSON.stringify(image))});\n`
  );
};

await mkdir(imageDirectory, { recursive: true });
for (const name of new Set(LINES.flatMap((line) => Object.values(line.forms)))) {
  const upstream = aliases[name] ?? name.toLowerCase();
  const record = records.find((row) => row['digimon name'] === upstream);
  if (record) await buildForm(name, upstream, record);
}

await writeFile(
  output,
  `import type { Animations } from './sprite.ts';\n${imageImports.join('\n')}\n\nexport const UP_IMAGES: Record<string, Animations> = {${imageEntries.join(',')}};\n`
);
console.log(`Built Digimon UP animations for ${forms.join(', ')}`);
