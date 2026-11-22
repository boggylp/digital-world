import type { ElementTable, RenderElement } from 'claude-code';

import { createImageSource, IMAGE_COLUMNS, IMAGE_ROWS, type Pixel } from '../src/sprite.ts';

export const PARTNER_KEY = 'partner';
const SVG_HEIGHT_PX = 64;

export type ImageFrame = { rgba: string; alt: string };
export type SvgFrame = { pixels: Pixel[][]; source: string; alt: string };

export const fitsImageCorner = (band: { maxRows: number; bodyColumns: number }): boolean =>
  band.maxRows >= IMAGE_ROWS && band.bodyColumns >= IMAGE_COLUMNS;

export const drawImageCorner = (
  { Image }: ElementTable<'terminal'>,
  frame: ImageFrame
): RenderElement => (
  <Image
    key={PARTNER_KEY}
    columns={IMAGE_COLUMNS}
    rows={IMAGE_ROWS}
    source={createImageSource(frame.rgba)}
    alt={frame.alt}
  />
);

export const drawSvgCorner = ({ Svg }: ElementTable<'desktop'>, frame: SvgFrame): RenderElement => {
  const columns = frame.pixels[0]?.length ?? 0;
  const width = Math.round((SVG_HEIGHT_PX * columns) / Math.max(1, frame.pixels.length));
  return <Svg source={frame.source} width={width} height={SVG_HEIGHT_PX} alt={frame.alt} />;
};

export const placeCorner = (
  { Box }: ElementTable,
  theirs: RenderElement,
  corner: RenderElement
): RenderElement => {
  if (!theirs) return corner;
  return (
    <Box flexDirection="row" justifyContent="space-between">
      <Box flexGrow={1}>{theirs}</Box>
      {corner}
    </Box>
  );
};
