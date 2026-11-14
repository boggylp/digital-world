import { expandHome } from './paths.ts';

export const PNG_HEADER_BYTES = 24;
export const MAX_IMAGE_BASE64 = Math.floor((2 * 1024 * 1024 * 4) / 3);
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const MAX_COLUMNS = 64;
const MAX_ROWS = 24;
const PIXELS_PER_COLUMN = 8;

export type Size = { width: number; height: number };
export type CellBox = { columns: number; rows: number };

export function readPngSize(bytes: Uint8Array): Size | null {
  if (bytes.length < PNG_HEADER_BYTES || PNG_SIGNATURE.some((byte, index) => bytes[index] !== byte)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  return width > 0 && height > 0 ? { width, height } : null;
}

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function decodeBase64Prefix(base64: string, byteCount: number): Uint8Array {
  const sextets = [...base64.slice(0, Math.ceil(byteCount / 3) * 4)].map(character => Math.max(0, BASE64_ALPHABET.indexOf(character)));
  const bytes = Array.from({ length: Math.floor((sextets.length * 6) / 8) }, (_, index) => {
    const bit = index * 8;
    const first = sextets[Math.floor(bit / 6)] ?? 0;
    const second = sextets[Math.floor(bit / 6) + 1] ?? 0;
    return ((first << 6) | second) >> (4 - (bit % 6)) & 0xff;
  });
  return Uint8Array.from(bytes.slice(0, byteCount));
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, Math.round(value)));
}

export function fitImage(size: Size, availableColumns: number): CellBox {
  const widest = clamp(Math.min(availableColumns, MAX_COLUMNS), 1, 255);
  const columns = clamp(size.width / PIXELS_PER_COLUMN, 1, widest);
  const rows = (columns * size.height) / size.width / 2;
  if (rows <= MAX_ROWS) return { columns, rows: clamp(rows, 1, MAX_ROWS) };
  return { columns: clamp((MAX_ROWS * 2 * size.width) / size.height, 1, widest), rows: MAX_ROWS };
}

export function isRemote(source: string): boolean {
  return /^https?:\/\//i.test(source);
}

export function resolveLocalPath(source: string, home: string): string {
  const decoded = decodeURI(source.replace(/^file:\/\//i, '').replace(/^\/(?=[A-Za-z]:)/, ''));
  return expandHome(decoded, home);
}
