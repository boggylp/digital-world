import type { Partner, Reaction } from './partner.ts';
import {
  FRAME_SIZE,
  FRAMES,
  placeDotPixels,
  readAnimationPixels,
  readPixels,
  type Pixel
} from './sprite.ts';
import { SHEETS } from './sprites.generated.ts';
import { UP_IMAGES } from './up-images.generated.ts';

export const MS_PER_SECOND = 1000;
export const TICKS_PER_SECOND = 10;
export const BEAT_TICKS = 5;
const TICK_MS = MS_PER_SECOND / TICKS_PER_SECOND;
const UP_FRAME_MS = 130;
const TURN_TICKS = 80;
const FACINGS = 2;
const PULSE_BEATS = 2;
const HURT_COLOR = 0xff_55_55;
const ANGRY_COLOR = 0xff_bf_47;

const readDotPixels = (form: string, frame: number, isMirrored: boolean): Pixel[][] => {
  const sheet = SHEETS[form];
  if (sheet === undefined) throw new Error(`No sprite for ${form}`);
  return readPixels(sheet, frame, isMirrored);
};

export const readStillPixels = (form: string): Pixel[][] => {
  const animation = UP_IMAGES[form];
  const frame = animation?.walking[0];
  if (animation !== undefined && frame !== undefined) return readAnimationPixels(animation, frame);
  return placeDotPixels(readDotPixels(form, 0, false));
};

const paintReaction = (pixels: Pixel[][], reaction: Reaction | null, beat: number): Pixel[][] => {
  if (reaction === null || beat % PULSE_BEATS !== 0) return pixels;
  if (reaction === 'happy') {
    const blank = pixels[0]?.map(() => null) ?? [];
    const height = pixels.length / FRAME_SIZE;
    return [...pixels.slice(height), ...Array.from({ length: height }, () => blank)];
  }
  const color = reaction === 'hurt' ? HURT_COLOR : ANGRY_COLOR;
  return pixels.map((row) => row.map((pixel) => (pixel === null ? null : color)));
};

const readActiveReaction = (partner: Partner, beat: number): Reaction | null =>
  beat < partner.reactionUntilTick ? partner.reaction : null;

export const readPartnerPixels = (partner: Partner, tick: number): Pixel[][] => {
  const form = partner.line.forms[partner.stage];
  const animation = UP_IMAGES[form];
  const beat = Math.floor(tick / BEAT_TICKS);
  const isMirrored = Math.floor(tick / TURN_TICKS) % FACINGS === 1;
  if (animation === undefined) {
    return placeDotPixels(
      readDotPixels(form, FRAMES.egg[beat % FRAMES.egg.length] ?? 0, isMirrored)
    );
  }
  const reaction = partner.isCalling ? 'angry' : readActiveReaction(partner, beat);
  const frames = reaction === null ? animation.walking : animation.idle;
  const frame = frames[Math.floor((tick * TICK_MS) / UP_FRAME_MS) % frames.length];
  if (frame === undefined) throw new Error(`No animation frames for ${form}`);
  const painted = paintReaction(readAnimationPixels(animation, frame), reaction, beat);
  return isMirrored ? painted.map((row) => row.toReversed()) : painted;
};
