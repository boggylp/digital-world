import type { ElementTable, RenderElement } from 'claude-code';

import {
  createImageSource,
  IMAGE_COLUMNS,
  IMAGE_ROWS,
  SPRITE_COLUMNS,
  SPRITE_ROWS,
  type Pixel
} from '../src/sprite.ts';

export const RASTER_KEY = 'partner';
const SVG_HEIGHT_PX = 64;

export type CellFrame = { cells: string; isImage: boolean; alt: string };
export type SvgFrame = { pixels: Pixel[][]; source: string; alt: string };

const measureCellCorner = (isImage: boolean): { columns: number; rows: number } =>
  isImage
    ? { columns: IMAGE_COLUMNS, rows: IMAGE_ROWS }
    : { columns: SPRITE_COLUMNS, rows: SPRITE_ROWS };

export const fitsCellCorner = (
  isImage: boolean,
  band: { maxRows: number; bodyColumns: number }
): boolean => {
  const { columns, rows } = measureCellCorner(isImage);
  return band.maxRows >= rows && band.bodyColumns >= columns;
};

export const drawCellCorner = (
  { Raster, Image }: ElementTable<'terminal'>,
  frame: CellFrame
): RenderElement => {
  const { columns, rows } = measureCellCorner(frame.isImage);
  return frame.isImage ? (
    <Image
      key={RASTER_KEY}
      columns={columns}
      rows={rows}
      source={createImageSource(frame.cells)}
      alt={frame.alt}
    />
  ) : (
    <Raster key={RASTER_KEY} columns={columns} rows={rows} cells={frame.cells} />
  );
};

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
