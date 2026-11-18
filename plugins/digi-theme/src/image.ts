import { expandHome } from './paths.ts';

const BYTES_PER_KIBIBYTE = 1024;
const MAX_IMAGE_MEBIBYTES = 2;
const BASE64_CHARS_PER_GROUP = 4;
const BYTES_PER_BASE64_GROUP = 3;
const BITS_PER_SEXTET = 6;
const BITS_PER_BYTE = 8;
const SEXTET_PAIR_SPARE_BITS = BITS_PER_SEXTET + BITS_PER_SEXTET - BITS_PER_BYTE;
const BYTE_MASK = 0xff;
const PNG_WIDTH_OFFSET = 16;
const PNG_HEIGHT_OFFSET = 20;

export const PNG_HEADER_BYTES = 24;
export const MAX_IMAGE_BASE64 = Math.floor((MAX_IMAGE_MEBIBYTES * BYTES_PER_KIBIBYTE * BYTES_PER_KIBIBYTE * BASE64_CHARS_PER_GROUP) / BYTES_PER_BASE64_GROUP);
const PNG_SIGNATURE = [...'\u0089PNG\r\n\u001A\n'].map(character => character.codePointAt(0) ?? 0);
const MAX_COLUMNS = 64;
const MAX_ROWS = 24;
const MAX_TERMINAL_COLUMNS = 255;
const PIXELS_PER_COLUMN = 8;
const CELL_HEIGHT_TO_WIDTH = 2;
const FILE_SCHEME = 'file://';

export type Size = { width: number; height: number };
export type CellBox = { columns: number; rows: number };

export const readPngSize = (bytes: Uint8Array): Size | null => {
  if (bytes.length < PNG_HEADER_BYTES || PNG_SIGNATURE.some((byte, index) => bytes[index] !== byte)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(PNG_WIDTH_OFFSET);
  const height = view.getUint32(PNG_HEIGHT_OFFSET);
  return width > 0 && height > 0 ? { width, height } : null;
};

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export const decodeBase64Prefix = (base64: string, byteCount: number): Uint8Array => {
  const sextets = Array.from(base64.slice(0, Math.ceil(byteCount / BYTES_PER_BASE64_GROUP) * BASE64_CHARS_PER_GROUP), character => Math.max(0, BASE64_ALPHABET.indexOf(character)));
  const bytes = Array.from({ length: Math.floor((sextets.length * BITS_PER_SEXTET) / BITS_PER_BYTE) }, (_slot, index) => {
    const bit = index * BITS_PER_BYTE;
    const first = sextets[Math.floor(bit / BITS_PER_SEXTET)] ?? 0;
    const second = sextets[Math.floor(bit / BITS_PER_SEXTET) + 1] ?? 0;
    return ((first << BITS_PER_SEXTET) | second) >> (SEXTET_PAIR_SPARE_BITS - (bit % BITS_PER_SEXTET)) & BYTE_MASK;
  });
  return Uint8Array.from(bytes.slice(0, byteCount));
};

const clamp = (value: number, minimum: number, maximum: number): number => Math.max(minimum, Math.min(maximum, Math.round(value)));

export const fitImage = (size: Size, availableColumns: number): CellBox => {
  const widest = clamp(Math.min(availableColumns, MAX_COLUMNS), 1, MAX_TERMINAL_COLUMNS);
  const columns = clamp(size.width / PIXELS_PER_COLUMN, 1, widest);
  const rows = (columns * size.height) / size.width / CELL_HEIGHT_TO_WIDTH;
  if (rows <= MAX_ROWS) return { columns, rows: clamp(rows, 1, MAX_ROWS) };
  return { columns: clamp((MAX_ROWS * CELL_HEIGHT_TO_WIDTH * size.width) / size.height, 1, widest), rows: MAX_ROWS };
};

export const isRemote = (source: string): boolean => /^https?:\/\//u.test(source.toLowerCase());

const stripFileScheme = (source: string): string =>
  source.slice(0, FILE_SCHEME.length).toLowerCase() === FILE_SCHEME ? source.slice(FILE_SCHEME.length) : source;

export const resolveLocalPath = (source: string, home: string): string => {
  const decoded = decodeURI(stripFileScheme(source).replace(/^\/(?=[A-Za-z]:)/u, ''));
  return expandHome(decoded, home);
};
