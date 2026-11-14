import { writeFileSync } from 'node:fs';

import { PNG } from 'pngjs';

import { VIBES } from '../src/palette.ts';

const SCALE = 6;
const WIDTH = 24;
const HEIGHT = 30;
const OUTLINE = [0x1c, 0x2b, 0x4a];
const SHELL = [0xfb, 0xf4, 0xe2];
const SHADE = [0xe3, 0xd6, 0xb8];
const SPOTS = [
  { x: 8, y: 9, radius: 3, color: VIBES.sky },
  { x: 16, y: 15, radius: 3.5, color: VIBES.sun },
  { x: 9, y: 21, radius: 2.5, color: VIBES.leaf },
  { x: 15, y: 6, radius: 1.8, color: VIBES.blossom }
].map(spot => ({ ...spot, color: readRgb(spot.color) }));

function readRgb(hex: string): number[] {
  return [1, 3, 5].map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16));
}

function readEggPixel(x: number, y: number): number[] | null {
  const centerX = WIDTH / 2 - 0.5;
  const normalizedY = (y - 16.5) / (y < 16 ? 15 : 12.5);
  const normalizedX = (x - centerX) / 10.5;
  const distance = normalizedX ** 2 + normalizedY ** 2;
  if (distance > 1) return null;
  if (distance > 0.8) return OUTLINE;
  const spot = SPOTS.find(candidate => Math.hypot(x - candidate.x, y - candidate.y) <= candidate.radius);
  if (spot) return spot.color;
  return x > centerX + 4 && y > 10 ? SHADE : SHELL;
}

const png = new PNG({ width: WIDTH * SCALE, height: HEIGHT * SCALE });
for (let y = 0; y < png.height; y++) {
  for (let x = 0; x < png.width; x++) {
    const pixel = readEggPixel(Math.floor(x / SCALE), Math.floor(y / SCALE));
    const offset = (y * png.width + x) * 4;
    png.data.set(pixel ? [...pixel, 0xff] : [0, 0, 0, 0], offset);
  }
}
writeFileSync(new URL('../assets/digitama.png', import.meta.url), PNG.sync.write(png));
