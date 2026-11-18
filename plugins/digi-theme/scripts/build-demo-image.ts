import { writeFile } from 'node:fs/promises';

import { PNG } from 'pngjs';

import { VIBES } from '../src/palette.ts';

const SCALE = 6;
const WIDTH = 24;
const HEIGHT = 30;
const HALF = 0.5;
const SQUARE = 2;
const HEX_RADIX = 16;
const HEX_DIGITS_PER_CHANNEL = 2;
const RGB_CHANNELS = 3;
const RGBA_CHANNELS = 4;
const OPAQUE = 0xff;
const EGG_CENTER_ROW = 16.5;
const EGG_WAIST_ROW = 16;
const EGG_TOP_RADIUS = 15;
const EGG_BOTTOM_RADIUS = 12.5;
const EGG_HALF_WIDTH = 10.5;
const OUTLINE_DISTANCE = 0.8;
const SHADE_COLUMN_OFFSET = 4;
const SHADE_START_ROW = 10;

const readRgb = (hex: string): number[] =>
  Array.from({ length: RGB_CHANNELS }, (_empty, channel) => {
    const offset = 1 + channel * HEX_DIGITS_PER_CHANNEL;
    return Number.parseInt(hex.slice(offset, offset + HEX_DIGITS_PER_CHANNEL), HEX_RADIX);
  });

const OUTLINE = readRgb('#1c2b4a');
const SHELL = readRgb('#fbf4e2');
const SHADE = readRgb('#e3d6b8');
const SPOTS = [
  { x: 8, y: 9, radius: 3, color: VIBES.sky },
  { x: 16, y: 15, radius: 3.5, color: VIBES.sun },
  { x: 9, y: 21, radius: 2.5, color: VIBES.leaf },
  { x: 15, y: 6, radius: 1.8, color: VIBES.blossom }
].map(spot => ({ ...spot, color: readRgb(spot.color) }));

const readEggPixel = (column: number, row: number): number[] | null => {
  const centerColumn = WIDTH * HALF - HALF;
  const normalizedRow = (row - EGG_CENTER_ROW) / (row < EGG_WAIST_ROW ? EGG_TOP_RADIUS : EGG_BOTTOM_RADIUS);
  const normalizedColumn = (column - centerColumn) / EGG_HALF_WIDTH;
  const distance = normalizedColumn ** SQUARE + normalizedRow ** SQUARE;
  if (distance > 1) return null;
  if (distance > OUTLINE_DISTANCE) return OUTLINE;
  const spot = SPOTS.find(candidate => Math.hypot(column - candidate.x, row - candidate.y) <= candidate.radius);
  if (spot) return spot.color;
  return column > centerColumn + SHADE_COLUMN_OFFSET && row > SHADE_START_ROW ? SHADE : SHELL;
};

const png = new PNG({ width: WIDTH * SCALE, height: HEIGHT * SCALE });
for (let pixelRow = 0; pixelRow < png.height; pixelRow++) {
  for (let pixelColumn = 0; pixelColumn < png.width; pixelColumn++) {
    const pixel = readEggPixel(Math.floor(pixelColumn / SCALE), Math.floor(pixelRow / SCALE));
    const offset = (pixelRow * png.width + pixelColumn) * RGBA_CHANNELS;
    png.data.set(pixel ? [...pixel, OPAQUE] : [0, 0, 0, 0], offset);
  }
}
await writeFile(new URL('../assets/digitama.png', import.meta.url), PNG.sync.write(png));
