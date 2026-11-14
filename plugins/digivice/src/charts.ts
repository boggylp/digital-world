import { CHART_TYPES, type ChartLanguage, type ChartType } from './blocks.ts';
import { pickSeriesColor, VIBES } from './palette.ts';

export type Run = { text: string; color?: string; dim?: boolean; bold?: boolean };
export type Line = Run[];


export type Series = { name: string; values: number[] };
export type Chart = { type: ChartType; title?: string; unit: string; labels: string[]; series: Series[] };

type Point = [number, number];

const SETTINGS = new Set(['type', 'title', 'x', 'unit']);
const EIGHTHS_HORIZONTAL = ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉'];
const EIGHTHS_VERTICAL = [' ', '▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
const SPARKS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
const LEADING_NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/u;
const BRAILLE_BASE = 0x28_00;
const LEFT_TOP_DOT = 0x01;
const LEFT_UPPER_DOT = 0x02;
const LEFT_LOWER_DOT = 0x04;
const RIGHT_TOP_DOT = 0x08;
const RIGHT_UPPER_DOT = 0x10;
const RIGHT_LOWER_DOT = 0x20;
const LEFT_BOTTOM_DOT = 0x40;
const RIGHT_BOTTOM_DOT = 0x80;
const BRAILLE_DOTS = [
  [LEFT_TOP_DOT, RIGHT_TOP_DOT],
  [LEFT_UPPER_DOT, RIGHT_UPPER_DOT],
  [LEFT_LOWER_DOT, RIGHT_LOWER_DOT],
  [LEFT_BOTTOM_DOT, RIGHT_BOTTOM_DOT]
];
const BRAILLE_DOT_COLUMNS = 2;
const BRAILLE_DOT_ROWS = 4;
const EIGHTHS_PER_CELL = 8;
const PLOT_ROWS = 8;
const PIE_ROWS = 8;
const PIE_HOLE = 0.45;
const PIE_DIAMETER = PIE_ROWS * BRAILLE_DOT_ROWS;
const PIE_COLUMNS = PIE_DIAMETER / BRAILLE_DOT_COLUMNS;
const MIDPOINT_FRACTION = 0.5;
const DOT_CENTER_OFFSET = 0.5;
const PIE_RADIUS = PIE_DIAMETER * MIDPOINT_FRACTION;
const FULL_TURN = Math.PI + Math.PI;
const PERCENT = 100;
const WHOLE_NUMBER_THRESHOLD = 100;
const DECIMAL_SCALE = 100;
const MAX_LABEL_WIDTH = 16;
const MIN_BAR_WIDTH = 4;
const BAR_GAPS = 3;
const MAX_SLOT_WIDTH = 8;
const MIN_SLOT_WIDTH = 3;
const MIN_PLOT_WIDTH = 8;
const AXIS_GAP = 2;
const MIN_SPARK_WIDTH = 4;
const SPARK_TEXT_WIDTH = 24;

const isChartType = (value: string): value is ChartType => (CHART_TYPES as readonly string[]).includes(value);

const readLeadingNumber = (token: string): number => {
  const match = LEADING_NUMBER.exec(token);
  return match ? Number(match[0]) : Number.NaN;
};

const parseNumbers = (text: string): number[] =>
  text
    .replaceAll(/(?<digit>\d),(?=\d{3}\b)/gu, '$<digit>')
    .split(/[,;\s]+/u)
    .filter(Boolean)
    .map(token => readLeadingNumber(token.replaceAll(/[^\d.eE+-]/gu, '')))
    .filter(value => Number.isFinite(value));

export const parseChart = (language: ChartLanguage, source: string): Chart | { error: string } => {
  const entries = source
    .split('\n')
    .map(line => /^\s*(?<key>[^:]+?)\s*:\s*(?<value>.*?)\s*$/u.exec(line))
    .flatMap(match => (match?.[1] ? [{ key: match[1], value: match[2] ?? '' }] : []));
  const setting = (key: string) => entries.find(entry => entry.key.toLowerCase() === key)?.value;
  const typeName = (language === 'chart' ? setting('type') : language)?.toLowerCase() ?? 'bar';
  if (!isChartType(typeName)) return { error: `unknown chart type "${typeName}"` };
  const series = entries
    .filter(entry => !SETTINGS.has(entry.key.toLowerCase()))
    .map(entry => ({ name: entry.key, values: parseNumbers(entry.value) }))
    .filter(entry => entry.values.length > 0);
  if (series.length === 0) return { error: 'no "name: number" rows' };
  const labels = (setting('x') ?? '').split(',').map(label => label.trim()).filter(Boolean);
  if (typeName === 'pie' && series.some(entry => (entry.values[0] ?? 0) <= 0)) return { error: 'pie needs positive values' };
  const title = setting('title');
  return { type: typeName, unit: setting('unit') ?? '', labels, series, ...(title ? { title } : {}) };
};

export const formatNumber = (value: number, unit = ''): string => {
  const rounded = Math.abs(value) >= WHOLE_NUMBER_THRESHOLD ? Math.round(value) : Math.round(value * DECIMAL_SCALE) / DECIMAL_SCALE;
  return `${rounded.toLocaleString('en-US')}${unit}`;
};

const fit = (text: string, width: number): string => (text.length > width ? `${text.slice(0, Math.max(0, width - 1))}…` : text.padEnd(width));

const readCategories = (chart: Chart): { label: string; value: number }[] =>
  chart.series.map(series => ({ label: series.name, value: series.values[0] ?? 0 }));

const renderHorizontalBars = (chart: Chart, columns: number): Line[] => {
  const categories = readCategories(chart);
  const labelWidth = Math.min(MAX_LABEL_WIDTH, Math.max(...categories.map(category => category.label.length)));
  const valueTexts = categories.map(category => formatNumber(category.value, chart.unit));
  const valueWidth = Math.max(...valueTexts.map(text => text.length));
  const barWidth = Math.max(MIN_BAR_WIDTH, columns - labelWidth - valueWidth - BAR_GAPS);
  const maximum = Math.max(...categories.map(category => Math.abs(category.value)), Number.EPSILON);
  return categories.map((category, index) => {
    const eighths = Math.round((Math.abs(category.value) / maximum) * barWidth * EIGHTHS_PER_CELL);
    const bar = '█'.repeat(Math.floor(eighths / EIGHTHS_PER_CELL)) + (EIGHTHS_HORIZONTAL[eighths % EIGHTHS_PER_CELL] ?? '');
    return [
      { text: `${fit(category.label, labelWidth)} `, dim: true },
      { text: bar.padEnd(barWidth), color: pickSeriesColor(index) },
      { text: ` ${valueTexts[index]}`, bold: true }
    ];
  });
};

const renderVerticalBars = (chart: Chart, columns: number): Line[] => {
  const categories = readCategories(chart);
  const slot = Math.min(MAX_SLOT_WIDTH, Math.floor(columns / categories.length));
  if (slot < MIN_SLOT_WIDTH) return renderHorizontalBars(chart, columns);
  const maximum = Math.max(...categories.map(category => Math.abs(category.value)), Number.EPSILON);
  const heights = categories.map(category => Math.round((Math.abs(category.value) / maximum) * PLOT_ROWS * EIGHTHS_PER_CELL));
  const barWidth = slot - 1;
  const rows = Array.from({ length: PLOT_ROWS }, (_emptyRow, row): Line => {
    const floor = (PLOT_ROWS - row - 1) * EIGHTHS_PER_CELL;
    return heights.map((height, index) => ({
      text: `${(EIGHTHS_VERTICAL[Math.max(0, Math.min(EIGHTHS_PER_CELL, height - floor))] ?? ' ').repeat(barWidth)  } `,
      color: pickSeriesColor(index)
    }));
  });
  const values: Line = categories.map(category => ({ text: fit(formatNumber(category.value, chart.unit), slot), bold: true }));
  const labels: Line = categories.map(category => ({ text: fit(category.label, slot), dim: true }));
  return [...rows, values, labels];
};

const scale = (value: number, minimum: number, maximum: number, steps: number): number =>
  maximum === minimum ? Math.floor(steps * MIDPOINT_FRACTION) : Math.round(((value - minimum) / (maximum - minimum)) * steps);

const drawSegment = (dots: Set<number>, width: number, start: Point, end: Point): void => {
  const steps = Math.max(Math.abs(end[0] - start[0]), Math.abs(end[1] - start[1]), 1);
  for (let step = 0; step <= steps; step++) {
    const column = Math.round(start[0] + ((end[0] - start[0]) * step) / steps);
    const row = Math.round(start[1] + ((end[1] - start[1]) * step) / steps);
    dots.add(row * width + column);
  }
};

const renderLegend = (names: readonly string[]): Line =>
  names.flatMap((name, index): Run[] => [
    { text: '● ', color: pickSeriesColor(index) },
    { text: `${name}   `, dim: true }
  ]);

const readAxisLabel = (row: number, chart: Chart, minimum: number, maximum: number): string => {
  if (row === 0) return formatNumber(maximum, chart.unit);
  return row === PLOT_ROWS - 1 ? formatNumber(minimum, chart.unit) : '';
};

const renderLines = (chart: Chart, columns: number): Line[] => {
  const all = chart.series.flatMap(series => series.values);
  const minimum = Math.min(...all);
  const maximum = Math.max(...all);
  const axisWidth = Math.max(formatNumber(minimum, chart.unit).length, formatNumber(maximum, chart.unit).length);
  const width = Math.max(MIN_PLOT_WIDTH, columns - axisWidth - AXIS_GAP);
  const pixelsWide = width * BRAILLE_DOT_COLUMNS;
  const pixelsTall = PLOT_ROWS * BRAILLE_DOT_ROWS;
  const layers = chart.series.map(series => {
    const dots = new Set<number>();
    const points = series.values.map((value, index): Point => [
      series.values.length === 1 ? 0 : Math.round((index / (series.values.length - 1)) * (pixelsWide - 1)),
      pixelsTall - 1 - scale(value, minimum, maximum, pixelsTall - 1)
    ]);
    points.forEach((point, index) => drawSegment(dots, pixelsWide, points[index - 1] ?? point, point));
    return dots;
  });
  const rows = Array.from({ length: PLOT_ROWS }, (_emptyRow, row): Line => {
    const axis = readAxisLabel(row, chart, minimum, maximum);
    const cells = Array.from({ length: width }, (_emptyCell, column): Run => {
      let bits = 0;
      let owner = -1;
      layers.forEach((dots, layer) => {
        BRAILLE_DOTS.forEach((pair, dotRow) =>
          pair.forEach((bit, dotColumn) => {
            if (dots.has((row * BRAILLE_DOT_ROWS + dotRow) * pixelsWide + column * BRAILLE_DOT_COLUMNS + dotColumn)) {
              bits |= bit;
              owner = layer;
            }
          })
        );
      });
      return { text: String.fromCodePoint(BRAILLE_BASE + bits), color: owner === -1 ? VIBES.dusk : pickSeriesColor(owner) };
    });
    return [{ text: `${axis.padStart(axisWidth)} `, dim: true }, { text: row === 0 || row === PLOT_ROWS - 1 ? '┤' : '│', color: VIBES.mountain }, ...cells];
  });
  const first = chart.labels[0] ?? '';
  const last = chart.labels.at(-1) ?? '';
  const footer: Line[] = chart.labels.length > 0 ? [[{ text: `${' '.repeat(axisWidth + AXIS_GAP)}${first}${last.padStart(Math.max(0, width - first.length))}`, dim: true }]] : [];
  return [...rows, ...footer, renderLegend(chart.series.map(series => series.name))];
};

const renderSparks = (chart: Chart, columns: number): Line[] => {
  const nameWidth = Math.min(MAX_LABEL_WIDTH, Math.max(...chart.series.map(series => series.name.length)));
  return chart.series.map((series, index) => {
    const minimum = Math.min(...series.values);
    const maximum = Math.max(...series.values);
    const room = Math.max(MIN_SPARK_WIDTH, columns - nameWidth - SPARK_TEXT_WIDTH);
    const values = series.values.slice(-room);
    const spark = values.map(value => SPARKS[scale(value, minimum, maximum, SPARKS.length - 1)]).join('');
    const last = series.values.at(-1) ?? 0;
    return [
      { text: `${fit(series.name, nameWidth)} `, dim: true },
      { text: spark, color: pickSeriesColor(index) },
      { text: ` ${formatNumber(last, chart.unit)}`, bold: true },
      { text: ` (${formatNumber(minimum, chart.unit)}–${formatNumber(maximum, chart.unit)})`, dim: true }
    ];
  });
};

const findSlice = (angle: number, bounds: readonly number[]): number => {
  const index = bounds.findIndex(bound => angle < bound);
  return index === -1 ? bounds.length - 1 : index;
};

const sumBounds = (values: readonly number[], total: number): number[] => {
  let sum = 0;
  return values.map(value => {
    sum += (value / total) * FULL_TURN;
    return sum;
  });
};

const renderPie = (chart: Chart): Line[] => {
  const categories = readCategories(chart);
  const total = categories.reduce((sum, category) => sum + category.value, 0) || 1;
  const bounds = sumBounds(categories.map(category => category.value), total);
  const legend = categories.map((category, index): Line => [
    { text: '  ■ ', color: pickSeriesColor(index) },
    { text: `${category.label} `, dim: false },
    { text: `${Math.round((category.value / total) * PERCENT)}%`, bold: true }
  ]);
  return Array.from({ length: Math.max(PIE_ROWS, legend.length) }, (_emptyRow, row): Line => {
    const disc = Array.from({ length: PIE_COLUMNS }, (_emptyCell, column): Run => {
      if (row >= PIE_ROWS) return { text: ' ' };
      let bits = 0;
      const votes = new Map<number, number>();
      BRAILLE_DOTS.forEach((pair, dotRow) =>
        pair.forEach((bit, dotColumn) => {
          const horizontal = column * BRAILLE_DOT_COLUMNS + dotColumn + DOT_CENTER_OFFSET - PIE_RADIUS;
          const vertical = row * BRAILLE_DOT_ROWS + dotRow + DOT_CENTER_OFFSET - PIE_RADIUS;
          const distance = Math.hypot(horizontal, vertical) / PIE_RADIUS;
          if (distance > 1 || distance < PIE_HOLE) return;
          const angle = (Math.atan2(horizontal, -vertical) + FULL_TURN) % FULL_TURN;
          const slice = findSlice(angle, bounds);
          bits |= bit;
          votes.set(slice, (votes.get(slice) ?? 0) + 1);
        })
      );
      const winner = [...votes].toSorted((left, right) => right[1] - left[1])[0]?.[0] ?? 0;
      return { text: String.fromCodePoint(BRAILLE_BASE + bits), color: pickSeriesColor(winner) };
    });
    return [...disc, ...(legend[row] ?? [])];
  });
};

export const renderChart = (chart: Chart, columns: number): Line[] => {
  const body = {
    bar: () => renderVerticalBars(chart, columns),
    hbar: () => renderHorizontalBars(chart, columns),
    line: () => renderLines(chart, columns),
    spark: () => renderSparks(chart, columns),
    pie: () => renderPie(chart)
  }[chart.type]();
  return chart.title ? [[{ text: `✦ ${chart.title}`, color: VIBES.sun, bold: true }], ...body] : body;
};
