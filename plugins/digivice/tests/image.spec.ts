import { describe, expect, test } from 'vitest';

import { decodeBase64Prefix, fitImage, readPngSize, resolveLocalPath } from '../src/image.ts';

const PNG_HEADER_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAJAAAAC0CAYAAAA';

describe('image', () => {
  test('readPngSize_PngHeader_ReturnsDimensions', () => {
    expect(readPngSize(decodeBase64Prefix(PNG_HEADER_BASE64, 24))).toEqual({ width: 144, height: 180 });
  });

  test('readPngSize_NotPng_ReturnsNull', () => {
    expect(readPngSize(decodeBase64Prefix('/9j/4AAQSkZJRgABAQAAAQABAAD', 24))).toBeNull();
  });

  test.each([
    [{ width: 144, height: 180 }, 80, { columns: 18, rows: 11 }],
    [{ width: 4000, height: 1000 }, 80, { columns: 64, rows: 8 }],
    [{ width: 4000, height: 1000 }, 30, { columns: 30, rows: 4 }],
    [{ width: 200, height: 4000 }, 80, { columns: 2, rows: 24 }]
  ])('fitImage_%o_In%iColumns_FitsTheBox', (size, columns, expected) => {
    expect(fitImage(size, columns)).toEqual(expected);
  });

  test.each([
    ['file:///C:/a/b.png', 'C:/a/b.png'],
    ['file:///home/a/b%20c.png', '/home/a/b c.png'],
    ['~/b.png', '/home/me/b.png'],
    ['./b.png', './b.png']
  ])('resolveLocalPath_%s_ReturnsFilePath', (source, expected) => {
    expect(resolveLocalPath(source, '/home/me')).toBe(expected);
  });
});
