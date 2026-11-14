import { RGBA_CHANNELS } from '../src/sprite.ts';

const ALPHA_OFFSET = 3;
const RGB_BYTES = 3;
const MIN_OPAQUE_ALPHA = 128;

export const readOpaqueColor = (rgba: Buffer, pixelIndex: number): number | null => {
  const offset = pixelIndex * RGBA_CHANNELS;
  return rgba.readUInt8(offset + ALPHA_OFFSET) < MIN_OPAQUE_ALPHA ? null : rgba.readUIntBE(offset, RGB_BYTES);
};
