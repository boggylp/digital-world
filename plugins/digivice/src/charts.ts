import { CHART_TYPES, type ChartLanguage, type ChartType } from './blocks.ts';
import { pickSeriesColor, VIBES } from './palette.ts';

export type Run = { text: string; color?: string; dim?: boolean; bold?: boolean };
export type Line = Run[];


export type Series = { name: string; values: number[] };
export type Chart = { type: ChartType; title?: string; unit: string; labels: string[]; series: Series[] };

const SETTINGS = new Set(['type', 'title', 'x', 'unit']);
const EIGHTHS_HORIZONTAL = ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉'];
const EIGHTHS_VERTICAL = [' ', '▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
const SPARKS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
const BRAILLE_BASE = 0x2800;
const BRAILLE_DOTS = [
  [0x01, 0x08],
  [0x02, 0x10],
  [0x04, 0x20],
  [0x40, 0x80]
];
const PLOT_ROWS = 8;
const PIE_ROWS = 8;
const PIE_HOLE = 0.45;

function isChartType(value: string): value is ChartType {
  return (CHART_TYPES as readonly string[]).includes(value);
}

function parseNumbers(text: string): number[] {
  return text
    .replace(/(\d),(?=\d{3}\b)/g, '$1')
    .split(/[,;\s]+/)
    .filter(Boolean)
    .map(token => Number.parseFloat(token.replace(/[^\d.eE+-]/g, '')))
    .filter(Number.isFinite);
}

export function parseChart(language: ChartLanguage, source: string): Chart | { error: string } {
  const entries = source
    .split('\n')
    .map(line => /^\s*([^:]+?)\s*:\s*(.*?)\s*$/.exec(line))
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
}

export function formatNumber(value: number, unit = ''): string {
  const rounded = Math.abs(value) >= 100 ? Math.round(value) : Math.round(value * 100) / 100;
  return `${rounded.toLocaleString('en-US')}${unit}`;
}

function fit(text: string, width: number): string {
  return text.length > width ? `${text.slice(0, Math.max(0, width - 1))}…` : text.padEnd(width);
}

function readCategories(chart: Chart): { label: string; value: number }[] {
  return chart.series.map(series => ({ label: series.name, value: series.values[0] ?? 0 }));
}

function renderHorizontalBars(chart: Chart, columns: number): Line[] {
  const categories = readCategories(chart);
  const labelWidth = Math.min(16, Math.max(...categories.map(category => category.label.length)));
  const valueTexts = categories.map(category => formatNumber(category.value, chart.unit));
  const valueWidth = Math.max(...valueTexts.map(text => text.length));
  const barWidth = Math.max(4, columns - labelWidth - valueWidth - 3);
  const maximum = Math.max(...categories.map(category => Math.abs(category.value)), Number.EPSILON);
  return categories.map((category, index) => {
    const eighths = Math.round((Math.abs(category.value) / maximum) * barWidth * 8);
    const bar = '█'.repeat(Math.floor(eighths / 8)) + (EIGHTHS_HORIZONTAL[eighths % 8] ?? '');
    return [
      { text: `${fit(category.label, labelWidth)} `, dim: true },
      { text: bar.padEnd(barWidth), color: pickSeriesColor(index) },
      { text: ` ${valueTexts[index]}`, bold: true }
    ];
  });
}

function renderVerticalBars(chart: Chart, columns: number): Line[] {
  const categories = readCategories(chart);
  const slot = Math.min(8, Math.floor(columns / categories.length));
  if (slot < 3) return renderHorizontalBars(chart, columns);
  const maximum = Math.max(...categories.map(category => Math.abs(category.value)), Number.EPSILON);
  const heights = categories.map(category => Math.round((Math.abs(category.value) / maximum) * PLOT_ROWS * 8));
  const barWidth = slot - 1;
  const rows = Array.from({ length: PLOT_ROWS }, (_, row): Line => {
    const floor = (PLOT_ROWS - row - 1) * 8;
    return heights.map((height, index) => ({
      text: (EIGHTHS_VERTICAL[Math.max(0, Math.min(8, height - floor))] ?? ' ').repeat(barWidth) + ' ',
      color: pickSeriesColor(index)
    }));
  });
  const values: Line = categories.map(category => ({ text: fit(formatNumber(category.value, chart.unit), slot), bold: true }));
  const labels: Line = categories.map(category => ({ text: fit(category.label, slot), dim: true }));
  return [...rows, values, labels];
}

function scale(value: number, minimum: number, maximum: number, steps: number): number {
  return maximum === minimum ? Math.floor(steps / 2) : Math.round(((value - minimum) / (maximum - minimum)) * steps);
}

function drawSegment(dots: Set<number>, width: number, from: [number, number], to: [number, number]): void {
  const steps = Math.max(Math.abs(to[0] - from[0]), Math.abs(to[1] - from[1]), 1);
  for (let step = 0; step <= steps; step++) {
    const x = Math.round(from[0] + ((to[0] - from[0]) * step) / steps);
    const y = Math.round(from[1] + ((to[1] - from[1]) * step) / steps);
    dots.add(y * width + x);
  }
}

function renderLines(chart: Chart, columns: number): Line[] {
  const all = chart.series.flatMap(series => series.values);
  const minimum = Math.min(...all);
  const maximum = Math.max(...all);
  const axisWidth = Math.max(formatNumber(minimum, chart.unit).length, formatNumber(maximum, chart.unit).length);
  const width = Math.max(8, columns - axisWidth - 2);
  const pixelsWide = width * 2;
  const pixelsTall = PLOT_ROWS * 4;
  const layers = chart.series.map(series => {
    const dots = new Set<number>();
    const points = series.values.map((value, index): [number, number] => [
      series.values.length === 1 ? 0 : Math.round((index / (series.values.length - 1)) * (pixelsWide - 1)),
      pixelsTall - 1 - scale(value, minimum, maximum, pixelsTall - 1)
    ]);
    points.forEach((point, index) => drawSegment(dots, pixelsWide, points[index - 1] ?? point, point));
    return dots;
  });
  const rows = Array.from({ length: PLOT_ROWS }, (_, row): Line => {
    const axis = row === 0 ? formatNumber(maximum, chart.unit) : row === PLOT_ROWS - 1 ? formatNumber(minimum, chart.unit) : '';
    const cells = Array.from({ length: width }, (_, column): Run => {
      let bits = 0;
      let owner = -1;
      layers.forEach((dots, layer) => {
        BRAILLE_DOTS.forEach((pair, dy) =>
          pair.forEach((bit, dx) => {
            if (dots.has((row * 4 + dy) * pixelsWide + column * 2 + dx)) {
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
  const footer: Line[] = chart.labels.length > 0 ? [[{ text: `${' '.repeat(axisWidth + 2)}${first}${last.padStart(Math.max(0, width - first.length))}`, dim: true }]] : [];
  return [...rows, ...footer, renderLegend(chart.series.map(series => series.name))];
}

function renderLegend(names: readonly string[]): Line {
  return names.flatMap((name, index): Run[] => [
    { text: '● ', color: pickSeriesColor(index) },
    { text: `${name}   `, dim: true }
  ]);
}

function renderSparks(chart: Chart, columns: number): Line[] {
  const nameWidth = Math.min(16, Math.max(...chart.series.map(series => series.name.length)));
  return chart.series.map((series, index) => {
    const minimum = Math.min(...series.values);
    const maximum = Math.max(...series.values);
    const room = Math.max(4, columns - nameWidth - 24);
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
}

function findSlice(angle: number, bounds: readonly number[]): number {
  const index = bounds.findIndex(bound => angle < bound);
  return index === -1 ? bounds.length - 1 : index;
}

function renderPie(chart: Chart): Line[] {
  const categories = readCategories(chart);
  const total = categories.reduce((sum, category) => sum + category.value, 0) || 1;
  const bounds = categories.reduce<number[]>((sums, category) => [...sums, (sums.at(-1) ?? 0) + (category.value / total) * Math.PI * 2], []);
  const columns = PIE_ROWS * 2;
  const radius = PIE_ROWS * 2;
  const legend = categories.map((category, index): Line => [
    { text: '  ■ ', color: pickSeriesColor(index) },
    { text: `${category.label} `, dim: false },
    { text: `${Math.round((category.value / total) * 100)}%`, bold: true }
  ]);
  return Array.from({ length: Math.max(PIE_ROWS, legend.length) }, (_, row): Line => {
    const disc = Array.from({ length: columns }, (_, column): Run => {
      if (row >= PIE_ROWS) return { text: ' ' };
      let bits = 0;
      const votes = new Map<number, number>();
      BRAILLE_DOTS.forEach((pair, dy) =>
        pair.forEach((bit, dx) => {
          const x = column * 2 + dx + 0.5 - radius;
          const y = row * 4 + dy + 0.5 - radius;
          const distance = Math.hypot(x, y) / radius;
          if (distance > 1 || distance < PIE_HOLE) return;
          const angle = (Math.atan2(x, -y) + Math.PI * 2) % (Math.PI * 2);
          const slice = findSlice(angle, bounds);
          bits |= bit;
          votes.set(slice, (votes.get(slice) ?? 0) + 1);
        })
      );
      const winner = [...votes].sort((left, right) => right[1] - left[1])[0]?.[0] ?? 0;
      return { text: String.fromCodePoint(BRAILLE_BASE + bits), color: pickSeriesColor(winner) };
    });
    return [...disc, ...(legend[row] ?? [])];
  });
}

export function renderChart(chart: Chart, columns: number): Line[] {
  const body = {
    bar: () => renderVerticalBars(chart, columns),
    hbar: () => renderHorizontalBars(chart, columns),
    line: () => renderLines(chart, columns),
    spark: () => renderSparks(chart, columns),
    pie: () => renderPie(chart)
  }[chart.type]();
  return chart.title ? [[{ text: `✦ ${chart.title}`, color: VIBES.sun, bold: true }], ...body] : body;
}
