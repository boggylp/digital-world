import { selectFrame, type Partner, type Reaction } from './partner.ts';
import {
  FRAME_SIZE,
  IMAGE_CANVAS,
  SPRITE_CANVAS,
  placeDotPixels,
  readAnimationPixels,
  readPixels,
  type Pixel
} from './sprite.ts';
import { SHEETS } from './sprites.generated.ts';
import { UP_IMAGES } from './up-images.generated.ts';
import { UP_SPRITES } from './up-sprites.generated.ts';

function readDotPixels(form: string, frame: number, isMirrored: boolean): Pixel[][] {
  const sheet = SHEETS[form];
  if (sheet === undefined) throw new Error(`No sprite for ${form}`);
  return readPixels(sheet, frame, isMirrored);
}

export function readStillPixels(form: string, isImage = false): Pixel[][] {
  const animation = (isImage ? UP_IMAGES : UP_SPRITES)[form];
  const frame = animation?.walking[0];
  if (animation !== undefined && frame !== undefined) return readAnimationPixels(animation, frame);
  return placeDotPixels(readDotPixels(form, 0, false), isImage ? IMAGE_CANVAS : SPRITE_CANVAS);
}

function paintReaction(pixels: Pixel[][], reaction: Reaction | null, beat: number): Pixel[][] {
  if (reaction === null || beat % 2 !== 0) return pixels;
  if (reaction === 'happy') {
    const blank = pixels[0]?.map(() => null) ?? [];
    const height = pixels.length / FRAME_SIZE;
    return [...pixels.slice(height), ...Array.from({ length: height }, () => blank)];
  }
  const color = reaction === 'hurt' ? 0xff5555 : 0xffbf47;
  return pixels.map((row) => row.map((pixel) => (pixel === null ? null : color)));
}

export function readPartnerPixels(partner: Partner, tick: number, isImage = false): Pixel[][] {
  const form = partner.line.forms[partner.stage];
  const animation = (isImage ? UP_IMAGES : UP_SPRITES)[form];
  const beat = Math.floor(tick / 5);
  const isMirrored = Math.floor(tick / 80) % 2 === 1;
  if (animation === undefined) {
    return placeDotPixels(
      readDotPixels(form, selectFrame(partner, beat), isMirrored),
      isImage ? IMAGE_CANVAS : SPRITE_CANVAS
    );
  }
  const reaction = partner.isCalling
    ? 'angry'
    : beat < partner.reactionUntilTick
      ? partner.reaction
      : null;
  const frames = reaction === null ? animation.walking : animation.idle;
  const frame = frames[Math.floor((tick * 100) / 130) % frames.length];
  if (frame === undefined) throw new Error(`No animation frames for ${form}`);
  const painted = paintReaction(readAnimationPixels(animation, frame), reaction, beat);
  return isMirrored ? painted.map((row) => row.toReversed()) : painted;
}
