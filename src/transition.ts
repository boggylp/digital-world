import { FRAMES, readPixels, type Pixel, type Sheet } from './sprite.ts';

export type Scene = { pixels: Pixel[][]; ticks: number }[];

const WHITE = 0xffffff;
const GOLD = 0xffe066;
const MORPH_STEPS = 10;
const SEED = 7;

function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1103515245) + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function paintSilhouette(pixels: Pixel[][]): Pixel[][] {
  return pixels.map((row) => row.map((pixel) => (pixel === null ? null : WHITE)));
}

function scatterSparkles(pixels: Pixel[][], amount: number, random: () => number): Pixel[][] {
  return pixels.map((row) =>
    row.map((pixel) => {
      if (random() >= amount) return pixel;
      return random() < 0.5 ? WHITE : GOLD;
    })
  );
}

function blendPixels(
  source: Pixel[][],
  target: Pixel[][],
  share: number,
  random: () => number
): Pixel[][] {
  return source.map((line, row) =>
    line.map((pixel, column) => (random() < share ? (target[row]?.[column] ?? null) : pixel))
  );
}

export function createDigivolution(source: Sheet, target: Sheet, isRising: boolean): Scene {
  const random = createRandom(SEED);
  const before = readPixels(source, FRAMES.walk[0], false);
  const after = readPixels(target, FRAMES.walk[0], false);
  const flashes = [1, 2, 3].flatMap(() => [
    { pixels: before, ticks: 3 },
    { pixels: paintSilhouette(before), ticks: 1 }
  ]);
  const morph = Array.from({ length: MORPH_STEPS }, (_step, step) => {
    const share = step / (MORPH_STEPS - 1);
    const sparkles = isRising ? 0.08 + 0.12 * Math.sin(Math.PI * share) : 0;
    return {
      pixels: scatterSparkles(
        paintSilhouette(blendPixels(before, after, share, random)),
        sparkles,
        random
      ),
      ticks: 1
    };
  });
  const reveal = [1, 2, 3].flatMap(() => [
    { pixels: paintSilhouette(after), ticks: 1 },
    { pixels: scatterSparkles(after, isRising ? 0.05 : 0, random), ticks: 1 }
  ]);
  return [...flashes, ...morph, ...reveal, { pixels: after, ticks: 1 }];
}

export function createHatching(egg: Sheet, baby: Sheet): Scene {
  const random = createRandom(SEED);
  const babyPixels = readPixels(baby, FRAMES.walk[0], false);
  const cracked = readPixels(egg, FRAMES.crack[0], false);
  const wobble = Array.from({ length: 6 }, (_step, step) => ({
    pixels: readPixels(egg, FRAMES.egg[step % 2] ?? 0, false),
    ticks: step < 3 ? 2 : 1
  }));
  const burst = [1, 2, 3].map(() => ({
    pixels: scatterSparkles(paintSilhouette(babyPixels), 0.15, random),
    ticks: 1
  }));
  return [
    ...wobble,
    { pixels: cracked, ticks: 5 },
    { pixels: paintSilhouette(cracked), ticks: 1 },
    ...burst
  ];
}

export function findScenePixels(scene: Scene, tick: number): Pixel[][] | null {
  let elapsed = 0;
  for (const step of scene) {
    elapsed += step.ticks;
    if (tick < elapsed) return step.pixels;
  }
  return null;
}
