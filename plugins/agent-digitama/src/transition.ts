import { placeDotPixels, FRAMES, readPixels, type Pixel, type Sheet } from './sprite.ts';

export type Scene = { pixels: Pixel[][]; ticks: number }[];

const WHITE = 0xff_ff_ff;
const GOLD = 0xff_e0_66;
const WHITE_SPARKLE_SHARE = 0.5;
const MORPH_STEPS = 10;
const MORPH_SPARKLES = 0.08;
const MORPH_SPARKLE_SWELL = 0.12;
const REVEAL_SPARKLES = 0.05;
const BURST_SPARKLES = 0.15;
const FLASHES = 3;
const REVEALS = 3;
const BURSTS = 3;
const SLOW_WOBBLES = 3;
const SLOW_WOBBLE_TICKS = 2;
const SEED = 7;
const RANDOM_MULTIPLIER = 1_103_515_245;
const RANDOM_INCREMENT = 12_345;
const RANDOM_MAX = 0x7f_ff_ff_ff;

const createRandom = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state = (Math.imul(state, RANDOM_MULTIPLIER) + RANDOM_INCREMENT) & RANDOM_MAX;
    return state / RANDOM_MAX;
  };
};

const paintSilhouette = (pixels: Pixel[][]): Pixel[][] =>
  pixels.map((row) => row.map((pixel) => (pixel === null ? null : WHITE)));

const scatterSparkles = (pixels: Pixel[][], amount: number, random: () => number): Pixel[][] =>
  pixels.map((row) =>
    row.map((pixel) => {
      if (random() >= amount) return pixel;
      return random() < WHITE_SPARKLE_SHARE ? WHITE : GOLD;
    })
  );

const blendPixels = (
  source: Pixel[][],
  target: Pixel[][],
  share: number,
  random: () => number
): Pixel[][] =>
  source.map((line, row) =>
    line.map((pixel, column) => (random() < share ? (target[row]?.[column] ?? null) : pixel))
  );

export const createDigivolution = (
  before: Pixel[][],
  after: Pixel[][],
  isRising: boolean
): Scene => {
  const random = createRandom(SEED);
  const flashes = Array.from({ length: FLASHES }, () => [
    { pixels: before, ticks: 3 },
    { pixels: paintSilhouette(before), ticks: 1 }
  ]).flat();
  const morph = Array.from({ length: MORPH_STEPS }, (_step, step) => {
    const share = step / (MORPH_STEPS - 1);
    const sparkles = isRising
      ? MORPH_SPARKLES + MORPH_SPARKLE_SWELL * Math.sin(Math.PI * share)
      : 0;
    return {
      pixels: scatterSparkles(
        paintSilhouette(blendPixels(before, after, share, random)),
        sparkles,
        random
      ),
      ticks: 1
    };
  });
  const reveal = Array.from({ length: REVEALS }, () => [
    { pixels: paintSilhouette(after), ticks: 1 },
    { pixels: scatterSparkles(after, isRising ? REVEAL_SPARKLES : 0, random), ticks: 1 }
  ]).flat();
  return [...flashes, ...morph, ...reveal, { pixels: after, ticks: 1 }];
};

export const createHatching = (egg: Sheet, babyPixels: Pixel[][]): Scene => {
  const random = createRandom(SEED);
  const canvas = { columns: babyPixels[0]?.length ?? 0, height: babyPixels.length };
  const cracked = placeDotPixels(readPixels(egg, FRAMES.crack[0], false), canvas);
  const wobble = Array.from({ length: 6 }, (_step, step) => ({
    pixels: placeDotPixels(
      readPixels(egg, FRAMES.egg[step % FRAMES.egg.length] ?? 0, false),
      canvas
    ),
    ticks: step < SLOW_WOBBLES ? SLOW_WOBBLE_TICKS : 1
  }));
  const burst = Array.from({ length: BURSTS }, () => ({
    pixels: scatterSparkles(paintSilhouette(babyPixels), BURST_SPARKLES, random),
    ticks: 1
  }));
  return [
    ...wobble,
    { pixels: cracked, ticks: 5 },
    { pixels: paintSilhouette(cracked), ticks: 1 },
    ...burst
  ];
};

export const findScenePixels = (scene: Scene, tick: number): Pixel[][] | null => {
  let elapsed = 0;
  for (const step of scene) {
    elapsed += step.ticks;
    if (tick < elapsed) return step.pixels;
  }
  return null;
};
